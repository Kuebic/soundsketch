import { useQuery } from 'convex/react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../convex/_generated/api';
import { Navbar } from '@/components/layout/Navbar';
import { TrackCard } from '@/components/tracks/TrackCard';
import { Loader2, Music, Upload, Share2 } from 'lucide-react';

export function Profile() {
  const viewer = useQuery(api.users.viewer);
  const myTracks = useQuery(api.tracks.getMyTracks);
  const sharedTracks = useQuery(api.tracks.getSharedWithMe);
  const navigate = useNavigate();

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
          <h1 className="text-2xl font-bold mb-2">{viewer.name || 'Anonymous'}</h1>
          {viewer.email && (
            <p className="text-sm text-studio-text-secondary">{viewer.email}</p>
          )}
        </div>

        {/* My Tracks */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">
              My Tracks
              {myTracks && (
                <span className="text-studio-text-secondary text-base ml-2">({myTracks.length})</span>
              )}
            </h2>
            <Link
              to="/upload"
              className="flex items-center gap-2 px-4 py-2 bg-studio-accent text-white rounded-lg text-sm font-medium hover:bg-studio-accent/90 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Track
            </Link>
          </div>

          {myTracks === undefined ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-studio-text-secondary" />
            </div>
          ) : myTracks.length === 0 ? (
            <div className="card text-center py-12">
              <Music className="w-16 h-16 mx-auto mb-4 text-studio-gray" />
              <p className="text-studio-text-secondary mb-4">
                You haven't uploaded any tracks yet.
              </p>
              <Link
                to="/upload"
                className="text-studio-accent hover:underline"
              >
                Upload your first track
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myTracks.map((track) => (
                <TrackCard key={track._id} track={track} showPrivacyBadge />
              ))}
            </div>
          )}
        </section>

        {/* Shared with Me */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Share2 className="w-6 h-6" />
            Shared with Me
            {sharedTracks && (
              <span className="text-studio-text-secondary text-base ml-2">({sharedTracks.length})</span>
            )}
          </h2>

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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sharedTracks.map((track) => (
                <TrackCard key={track._id} track={track} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
