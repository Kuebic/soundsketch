import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import { Navbar } from '@/components/layout/Navbar';
import { TrackCard } from '@/components/tracks/TrackCard';
import { Button } from '@/components/ui/Button';
import { Loader2, Music, Upload, Share2, Pencil } from 'lucide-react';
import { TrackFilter } from '@/components/tracks/TrackFilter';

export function Profile() {
  const viewer = useQuery(api.users.viewer);
  const updateName = useMutation(api.users.updateName);
  const myTracks = useQuery(api.tracks.getMyTracks);
  const sharedTracks = useQuery(api.tracks.getSharedWithMe);
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [myTracksFilter, setMyTracksFilter] = useState('');
  const [sharedFilter, setSharedFilter] = useState('');

  const filteredMyTracks = myTracks?.filter(track =>
    track.title.toLowerCase().includes(myTracksFilter.toLowerCase())
  );
  const filteredSharedTracks = sharedTracks?.filter(track =>
    track.title.toLowerCase().includes(sharedFilter.toLowerCase())
  );

  const handleStartEdit = () => {
    setNameInput(viewer?.name || '');
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleSave = async () => {
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
      setSaving(true);
      await updateName({ name: trimmed });
      setEditing(false);
      toast.success('Name updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setSaving(false);
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
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">Display Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="input"
                  maxLength={50}
                  autoFocus
                  disabled={saving}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSave();
                    if (e.key === 'Escape') handleCancel();
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void handleSave()} disabled={saving || !nameInput.trim()}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button size="sm" variant="secondary" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{viewer.name || 'Anonymous'}</h1>
                <button
                  onClick={handleStartEdit}
                  className="p-1.5 hover:bg-studio-dark rounded-lg transition-colors text-studio-text-secondary hover:text-studio-accent"
                  title="Edit name"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              {viewer.email && (
                <p className="text-sm text-studio-text-secondary">{viewer.email}</p>
              )}
            </>
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
      </main>
    </div>
  );
}
