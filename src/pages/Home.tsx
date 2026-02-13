import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Link } from 'react-router-dom';
import { Music, Clock, User } from 'lucide-react';
import { formatDuration, formatRelativeTime } from '@/lib/utils';
import { Navbar } from '@/components/layout/Navbar';

export function Home() {
  const publicTracks = useQuery(api.tracks.getPublicTracks);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="mb-12 animate-fade-in text-center">
          <h1 className="text-6xl font-bold mb-4 gradient-text">
            SoundSketch
          </h1>
          <p className="text-xl text-studio-text-secondary mono">
            Collaborate on music with timestamp-precise feedback
          </p>
        </div>

        {/* Public Tracks */}
        <section className="animate-slide-up">
          <h2 className="text-2xl font-semibold mb-6">Public Tracks</h2>

          {publicTracks === undefined ? (
            <div className="text-studio-text-secondary">Loading tracks...</div>
          ) : publicTracks.length === 0 ? (
            <div className="card text-center py-12">
              <Music className="w-16 h-16 mx-auto mb-4 text-studio-gray" />
              <p className="text-studio-text-secondary">
                No public tracks yet. Be the first to share!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicTracks.map((track) => (
                <Link
                  key={track._id}
                  to={`/track/${track.shareableId}`}
                  className="card hover:scale-105 transition-transform"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1 line-clamp-1">
                        {track.title}
                      </h3>
                      <p className="text-sm text-studio-text-secondary flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        {track.creatorName}
                      </p>
                    </div>
                  </div>

                  {track.description && (
                    <p className="text-sm text-studio-text-secondary mb-3 line-clamp-2">
                      {track.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-studio-text-secondary mono">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatRelativeTime(track._creationTime)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
