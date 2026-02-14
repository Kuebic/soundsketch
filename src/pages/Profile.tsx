import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api';
import { Navbar } from '@/components/layout/Navbar';
import { TrackCard } from '@/components/tracks/TrackCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Loader2, Music, Upload, Share2, Pencil, Settings, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { TrackFilter } from '@/components/tracks/TrackFilter';

export function Profile() {
  const viewer = useQuery(api.users.viewer);
  const updateName = useMutation(api.users.updateName);
  const updateEmail = useMutation(api.users.updateEmail);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const myTracks = useQuery(api.tracks.getMyTracks);
  const sharedTracks = useQuery(api.tracks.getSharedWithMe);
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
        <div className="card mb-8 max-w-md">
          {/* Name Section */}
          {editingName ? (
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Display Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="input"
                  maxLength={50}
                  autoFocus
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
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-2xl font-bold">{viewer.name || 'Anonymous'}</h1>
              <button
                onClick={handleStartEditName}
                className="p-1.5 hover:bg-studio-dark rounded-lg transition-colors text-studio-text-secondary hover:text-studio-accent"
                title="Edit name"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Email Section */}
          {editingEmail ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="input"
                  autoFocus
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
            <div className="flex items-center gap-2">
              <p className="text-sm text-studio-text-secondary">{viewer.email || 'No email set'}</p>
              <button
                onClick={handleStartEditEmail}
                className="p-1 hover:bg-studio-dark rounded-lg transition-colors text-studio-text-secondary hover:text-studio-accent"
                title="Edit email"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* My Tracks */}
        <section>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h2 className="text-2xl font-semibold">
              My Tracks
              {myTracks && (
                <span className="text-studio-text-secondary text-base ml-2">({myTracks.length})</span>
              )}
            </h2>
            <div className="flex items-center gap-3">
              {myTracks && myTracks.length >= 2 && (
                <TrackFilter
                  value={myTracksFilter}
                  onChange={setMyTracksFilter}
                  placeholder="Filter my tracks..."
                />
              )}
              <Link
                to="/upload"
                className="flex items-center gap-2 px-4 py-2 bg-studio-accent text-white rounded-lg text-sm font-medium hover:bg-studio-accent/90 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Track
              </Link>
            </div>
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
                <TrackCard key={track._id} track={track} showPrivacyBadge />
              ))}
            </div>
          )}
        </section>

        {/* Shared with Me */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Share2 className="w-6 h-6" />
              Shared with Me
              {sharedTracks && (
                <span className="text-studio-text-secondary text-base ml-2">({sharedTracks.length})</span>
              )}
            </h2>
            {sharedTracks && sharedTracks.length >= 2 && (
              <TrackFilter
                value={sharedFilter}
                onChange={setSharedFilter}
                placeholder="Filter shared tracks..."
              />
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
                <TrackCard key={track._id} track={track} />
              ))}
            </div>
          )}
        </section>

        {/* Account Settings */}
        <section className="mt-12">
          <button
            onClick={() => setSettingsExpanded(!settingsExpanded)}
            className="flex items-center gap-2 text-studio-text-secondary hover:text-studio-text transition-colors"
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
            <div className="mt-4 card border-red-500/30 max-w-md">
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
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
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
