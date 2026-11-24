import { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api';
import { Navbar } from '@/components/layout/Navbar';
import { TrackCard } from '@/components/tracks/TrackCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ListMusic, Loader2, Music, Plus, Trash2, Upload, Share2, Pencil, Settings, AlertTriangle, ChevronDown, ChevronUp, LogOut } from 'lucide-react';
import { TrackFilter } from '@/components/tracks/TrackFilter';
import { CreatePlaylistModal } from '@/components/playlists/CreatePlaylistModal';
import { DeletePlaylistModal } from '@/components/playlists/DeletePlaylistModal';
import type { PlaylistId } from '@/types';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent focus-visible:ring-offset-2 focus-visible:ring-offset-studio-black';

export function Profile() {
  const viewer = useQuery(api.users.viewer);
  const updateName = useMutation(api.users.updateName);
  const updateEmail = useMutation(api.users.updateEmail);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const changePassword = useAction(api.users.changePassword);
  const myTracks = useQuery(api.tracks.getMyTracks);
  const sharedTracks = useQuery(api.tracks.getSharedWithMe);
  const myPlaylists = useQuery(api.playlists.getMyPlaylists);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  // Resolved against the live list, so the dialog shows the current title and
  // closes by itself if the playlist is deleted elsewhere.
  const [playlistToDeleteId, setPlaylistToDeleteId] = useState<PlaylistId | null>(null);
  const playlistToDelete = myPlaylists?.find((p) => p._id === playlistToDeleteId);
  const navigate = useNavigate();
  const { signOut } = useAuthActions();

  // Name editing state
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Email editing state
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Account settings state
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletionMode, setDeletionMode] = useState<'keep_comments' | 'delete_everything'>('keep_comments');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Password change state
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [myTracksFilter, setMyTracksFilter] = useState('');
  const [sharedFilter, setSharedFilter] = useState('');

  const filteredMyTracks = myTracks?.filter(track =>
    track.title.toLowerCase().includes(myTracksFilter.toLowerCase())
  );
  const filteredSharedTracks = sharedTracks?.filter(track =>
    track.title.toLowerCase().includes(sharedFilter.toLowerCase())
  );

  // Name editing handlers
  const handleStartEditName = () => {
    setNameInput(viewer?.name || '');
    setEditingName(true);
  };

  const handleCancelName = () => {
    setEditingName(false);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      toast.error('Name cannot be empty');
      return;
    }
    if (trimmed.length > 50) {
      toast.error('Name must be 50 characters or fewer');
      return;
    }
    try {
      setSavingName(true);
      await updateName({ name: trimmed });
      setEditingName(false);
      toast.success('Name updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  // Email editing handlers
  const handleStartEditEmail = () => {
    setEmailInput(viewer?.email || '');
    setEditingEmail(true);
  };

  const handleCancelEmail = () => {
    setEditingEmail(false);
  };

  const handleSaveEmail = async () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) {
      toast.error('Email cannot be empty');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      toast.error('Invalid email format');
      return;
    }
    try {
      setSavingEmail(true);
      await updateEmail({ email: trimmed });
      setEditingEmail(false);
      toast.success('Email updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update email');
    } finally {
      setSavingEmail(false);
    }
  };

  // Account deletion handler
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    try {
      setDeleting(true);
      await deleteAccount({ deletionMode });
      await signOut();
      toast.success('Account deleted successfully');
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account');
      setDeleting(false);
    }
  };

  // Password change handlers
  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    try {
      setSavingPassword(true);
      await changePassword({ currentPassword, newPassword });
      toast.success('Password changed successfully');
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change password';
      toast.error(message);
    } finally {
      setSavingPassword(false);
    }
  };

  const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sign out');
      setSigningOut(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setChangingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  // Auth guard
  if (viewer === undefined) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-studio-accent" />
        </div>
      </div>
    );
  }

  if (viewer === null) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        {/* User Info */}
        <div className="card hover:border-studio-gray hover:shadow-none mb-10 max-w-lg">
          <div className="flex items-start gap-4">
            <div
              aria-hidden="true"
              className="flex h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 items-center justify-center rounded-full border border-studio-accent/30 bg-studio-accent/15 font-mono text-lg sm:text-xl font-bold text-studio-accent"
            >
              {(viewer.name || viewer.email || '?').trim().charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              {/* Name Section */}
              {editingName ? (
                <div className="space-y-3 mb-3">
                  <div>
                    <label htmlFor="profile-name" className="block text-sm font-medium mb-1.5">Display Name</label>
                    <input
                      id="profile-name"
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="input"
                      maxLength={50}
                      autoFocus
                      autoComplete="name"
                      disabled={savingName}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleSaveName();
                        if (e.key === 'Escape') handleCancelName();
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void handleSaveName()} disabled={savingName || !nameInput.trim()}>
                      {savingName ? 'Saving...' : 'Save'}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleCancelName} disabled={savingName}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold truncate">{viewer.name || 'Anonymous'}</h1>
                  <button
                    type="button"
                    onClick={handleStartEditName}
                    className={`flex-shrink-0 p-2 hover:bg-studio-dark rounded-lg transition-colors text-studio-text-secondary hover:text-studio-accent ${FOCUS_RING}`}
                    title="Edit name"
                    aria-label="Edit display name"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Email Section */}
              {editingEmail ? (
                <div className="space-y-3 mt-2">
                  <div>
                    <label htmlFor="profile-email" className="block text-sm font-medium mb-1.5">Email</label>
                    <input
                      id="profile-email"
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="input"
                      autoFocus
                      autoComplete="email"
                      disabled={savingEmail}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleSaveEmail();
                        if (e.key === 'Escape') handleCancelEmail();
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void handleSaveEmail()} disabled={savingEmail || !emailInput.trim()}>
                      {savingEmail ? 'Saving...' : 'Save'}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleCancelEmail} disabled={savingEmail}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1 min-w-0">
                  <p className="text-sm text-studio-text-secondary truncate">{viewer.email || 'No email set'}</p>
                  <button
                    type="button"
                    onClick={handleStartEditEmail}
                    className={`flex-shrink-0 p-2 hover:bg-studio-dark rounded-lg transition-colors text-studio-text-secondary hover:text-studio-accent ${FOCUS_RING}`}
                    title="Edit email"
                    aria-label="Edit email"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* My Tracks */}
        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex items-center justify-between gap-3 min-w-0 sm:contents">
              <h2 className="text-xl sm:text-2xl font-semibold min-w-0 truncate sm:mr-auto">
                My Tracks
                {myTracks && (
                  <span className="text-studio-text-secondary text-base ml-2">({myTracks.length})</span>
                )}
              </h2>
              <Link
                to="/upload"
                className={`sm:order-last shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3.5 py-2 bg-studio-accent text-white rounded-lg text-sm font-medium hover:bg-studio-accent/90 transition-colors ${FOCUS_RING}`}
              >
                <Upload className="w-4 h-4" />
                Upload Track
              </Link>
            </div>
            {myTracks && myTracks.length >= 2 && (
              <div className="w-full sm:w-64 [&>div]:max-w-none">
                <TrackFilter
                  value={myTracksFilter}
                  onChange={setMyTracksFilter}
                  placeholder="Filter my tracks..."
                />
              </div>
            )}
          </div>

          {myTracks === undefined ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-studio-text-secondary" />
            </div>
          ) : myTracks.length === 0 ? (
            <div className="card text-center py-12">
              <Music className="w-16 h-16 mx-auto mb-4 text-studio-gray" />
              <p className="text-studio-text-secondary mb-4">
                You haven&apos;t uploaded any tracks yet.
              </p>
              <Link
                to="/upload"
                className="text-studio-accent hover:underline"
              >
                Upload your first track
              </Link>
            </div>
          ) : filteredMyTracks && filteredMyTracks.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-studio-text-secondary">
                No tracks matching &ldquo;{myTracksFilter}&rdquo;
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMyTracks?.map((track) => (
                <TrackCard key={track._id} track={track} list={filteredMyTracks} showPrivacyBadge />
              ))}
            </div>
          )}
        </section>

        {/* Playlists */}
        <section className="mt-12">
          <div className="flex items-center justify-between gap-3 mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold flex items-center gap-2 min-w-0">
              <ListMusic className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
              Playlists
              {myPlaylists && (
                <span className="text-studio-text-secondary text-base ml-2">({myPlaylists.length})</span>
              )}
            </h2>
            <Button size="sm" variant="secondary" onClick={() => setCreatePlaylistOpen(true)}>
              <Plus className="w-4 h-4" />
              New Playlist
            </Button>
          </div>

          {myPlaylists === undefined ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-studio-text-secondary" />
            </div>
          ) : myPlaylists.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-studio-text-secondary">
                No playlists yet. Create one to send several tracks with a single link.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myPlaylists.map((playlist) => (
                <li
                  key={playlist._id}
                  className="card relative transition-all duration-200 hover:-translate-y-0.5 hover:border-studio-accent/50"
                >
                  <div className="flex items-start gap-2">
                    <h3 className="flex-1 min-w-0 font-semibold text-lg leading-snug line-clamp-1">
                      <Link
                        to={`/playlist/${playlist.shareableId}`}
                        className="after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-studio-accent"
                      >
                        {playlist.title}
                      </Link>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setPlaylistToDeleteId(playlist._id)}
                      aria-label={`Delete playlist ${playlist.title}`}
                      title="Delete playlist"
                      className={`relative z-10 shrink-0 -mr-1 -mt-1 p-2 rounded-lg text-studio-text-secondary hover:text-red-400 hover:bg-studio-dark transition-colors ${FOCUS_RING}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="mono text-xs text-studio-text-secondary mt-1">
                    {playlist.trackCount} {playlist.trackCount === 1 ? 'track' : 'tracks'}
                  </p>
                  {playlist.description && (
                    <p className="text-sm text-studio-text-secondary mt-2 line-clamp-2">
                      {playlist.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <CreatePlaylistModal
          isOpen={createPlaylistOpen}
          onClose={() => setCreatePlaylistOpen(false)}
          onCreated={({ shareableId }) => navigate(`/playlist/${shareableId}`)}
        />

        {playlistToDelete && (
          <DeletePlaylistModal
            key={playlistToDelete._id}
            playlist={playlistToDelete}
            onClose={() => setPlaylistToDeleteId(null)}
          />
        )}

        {/* Shared with Me */}
        <section className="mt-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
              Shared with Me
              {sharedTracks && (
                <span className="text-studio-text-secondary text-base ml-2">({sharedTracks.length})</span>
              )}
            </h2>
            {sharedTracks && sharedTracks.length >= 2 && (
              <div className="w-full sm:w-64 [&>div]:max-w-none">
                <TrackFilter
                  value={sharedFilter}
                  onChange={setSharedFilter}
                  placeholder="Filter shared tracks..."
                />
              </div>
            )}
          </div>

          {sharedTracks === undefined ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-studio-text-secondary" />
            </div>
          ) : sharedTracks.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-studio-text-secondary">
                No tracks have been shared with you yet.
              </p>
            </div>
          ) : filteredSharedTracks && filteredSharedTracks.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-studio-text-secondary">
                No shared tracks matching &ldquo;{sharedFilter}&rdquo;
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSharedTracks?.map((track) => (
                <TrackCard key={track._id} track={track} list={filteredSharedTracks} />
              ))}
            </div>
          )}
        </section>

        {/* Account Settings */}
        <section className="mt-12">
          <button
            type="button"
            onClick={() => setSettingsExpanded(!settingsExpanded)}
            aria-expanded={settingsExpanded}
            aria-controls="account-settings-panel"
            className={`flex items-center gap-2 rounded-lg text-studio-text-secondary hover:text-studio-text-primary transition-colors ${FOCUS_RING}`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-lg font-medium">Account Settings</span>
            {settingsExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {settingsExpanded && (
            <div id="account-settings-panel" className="mt-4 space-y-4 max-w-lg">
              {/* Change Password */}
              <div className="card">
                <h3 className="font-semibold mb-3">Change Password</h3>
                {changingPassword ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Current Password</label>
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="input"
                        placeholder="Enter current password"
                        disabled={savingPassword}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">New Password</label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="input"
                        placeholder="Enter new password"
                        disabled={savingPassword}
                      />
                      <p className="text-xs text-studio-text-secondary mt-1">
                        Must be at least 8 characters
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="input"
                        placeholder="Confirm new password"
                        disabled={savingPassword}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleChangePassword();
                          if (e.key === 'Escape') handleCancelPasswordChange();
                        }}
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => void handleChangePassword()}
                        disabled={savingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                      >
                        {savingPassword ? 'Saving...' : 'Change Password'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleCancelPasswordChange}
                        disabled={savingPassword}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setChangingPassword(true)}
                  >
                    Change Password
                  </Button>
                )}
              </div>

              {/* Sign Out */}
              <div className="card hover:border-studio-gray hover:shadow-none flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-semibold">Sign Out</h3>
                  <p className="text-sm text-studio-text-secondary mt-0.5">
                    End your session on this device.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  className="shrink-0"
                >
                  {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  {signingOut ? 'Signing out...' : 'Sign Out'}
                </Button>
              </div>

              {/* Danger Zone */}
              <div className="card border-red-500/30">
                <div className="flex items-center gap-2 text-red-400 mb-3">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="font-semibold">Danger Zone</h3>
                </div>
                <p className="text-sm text-studio-text-secondary mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <Button
                  variant="danger"
                  onClick={() => setDeleteModalOpen(true)}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Delete Account Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setDeleteConfirmation('');
            setDeletionMode('keep_comments');
          }}
          title="Delete Account"
        >
          <div className="space-y-6">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-400">This action cannot be undone</p>
                  <p className="text-sm text-studio-text-secondary mt-1">
                    This will permanently delete your account, all your tracks, versions, and associated data.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">
                What should happen to your comments on other people&apos;s tracks?
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border border-studio-gray rounded-lg cursor-pointer hover:border-studio-accent/50 transition-colors">
                  <input
                    type="radio"
                    name="deletionMode"
                    value="keep_comments"
                    checked={deletionMode === 'keep_comments'}
                    onChange={() => setDeletionMode('keep_comments')}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium">Keep my comments (anonymized)</span>
                    <p className="text-sm text-studio-text-secondary mt-0.5">
                      Your comments will remain but be attributed to &quot;Deleted User&quot;
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border border-studio-gray rounded-lg cursor-pointer hover:border-studio-accent/50 transition-colors">
                  <input
                    type="radio"
                    name="deletionMode"
                    value="delete_everything"
                    checked={deletionMode === 'delete_everything'}
                    onChange={() => setDeletionMode('delete_everything')}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium">Delete all my data</span>
                    <p className="text-sm text-studio-text-secondary mt-0.5">
                      Remove everything including all comments on other tracks
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Type <span className="font-mono text-red-400">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="input font-mono"
                placeholder="DELETE"
                disabled={deleting}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="danger"
                onClick={() => void handleDeleteAccount()}
                disabled={deleting || deleteConfirmation !== 'DELETE'}
                className="flex-1"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete My Account'
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteConfirmation('');
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}
