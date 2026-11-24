import { useQuery } from 'convex/react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../convex/_generated/api';
import { LogIn, Music, SearchX, Upload } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { TrackCard } from '@/components/tracks/TrackCard';

const emptyCtaClass =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 font-medium bg-studio-accent text-white hover:bg-studio-accent/90 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent focus-visible:ring-offset-2 focus-visible:ring-offset-studio-black';

export function Home() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchQuery = searchParams.get('q') || '';
  const tracks = useQuery(api.tracks.searchPublicTracks, { searchText: searchQuery });
  const hasSearch = searchQuery.trim().length > 0;
  const viewer = useQuery(api.users.viewer);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="relative isolate mb-8 sm:mb-12 animate-fade-in text-center">
          {/* Ambient glow behind the heading */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-48 w-[min(40rem,100%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.18),rgba(6,182,212,0.06)_45%,transparent_70%)] blur-2xl"
          />
          <h1 className="text-4xl sm:text-6xl font-bold mb-3 sm:mb-4 gradient-text">
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
                  <p className="text-studio-text-secondary mb-6">
                    No public tracks yet. Be the first to share!
                  </p>
                  {viewer !== undefined && (
                    viewer ? (
                      <Link to="/upload" className={emptyCtaClass}>
                        <Upload className="w-4 h-4" />
                        Upload a Track
                      </Link>
                    ) : (
                      <Link to="/login?returnTo=%2Fupload" className={emptyCtaClass}>
                        <LogIn className="w-4 h-4" />
                        Sign in to Share
                      </Link>
                    )
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tracks.map((track) => (
                <TrackCard key={track._id} track={track} list={tracks} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
