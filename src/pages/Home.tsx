import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Music } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { TrackCard } from '@/components/tracks/TrackCard';

export function Home() {
  const publicTracks = useQuery(api.tracks.getPublicTracks);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="mb-12 animate-fade-in text-center">
          <h1 className="text-4xl sm:text-6xl font-bold mb-4 gradient-text">
            SoundSketch
          </h1>
          <p className="text-base sm:text-xl text-studio-text-secondary mono">
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
                <TrackCard key={track._id} track={track} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
