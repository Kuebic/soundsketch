import { useQuery } from 'convex/react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../convex/_generated/api';
import { Music, SearchX } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { TrackCard } from '@/components/tracks/TrackCard';

export function Home() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchQuery = searchParams.get('q') || '';
  const tracks = useQuery(api.tracks.searchPublicTracks, { searchText: searchQuery });
  const hasSearch = searchQuery.trim().length > 0;

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

        {/* Tracks */}
        <section className="animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">
              {hasSearch ? (
                <>
                  Results for <span className="text-studio-accent">&ldquo;{searchQuery}&rdquo;</span>
                </>
              ) : (
                'Public Tracks'
              )}
            </h2>
            {hasSearch && (
              <button
                onClick={() => navigate('/')}
                className="text-sm text-studio-text-secondary hover:text-studio-accent transition-colors"
              >
                Clear search
              </button>
            )}
          </div>

          {tracks === undefined ? (
            <div className="text-studio-text-secondary">Loading tracks...</div>
          ) : tracks.length === 0 ? (
            <div className="card text-center py-12">
              {hasSearch ? (
                <>
                  <SearchX className="w-16 h-16 mx-auto mb-4 text-studio-gray" />
                  <p className="text-studio-text-secondary">
                    No tracks found for &ldquo;{searchQuery}&rdquo;
                  </p>
                </>
              ) : (
                <>
                  <Music className="w-16 h-16 mx-auto mb-4 text-studio-gray" />
                  <p className="text-studio-text-secondary">
                    No public tracks yet. Be the first to share!
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tracks.map((track) => (
                <TrackCard key={track._id} track={track} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
