import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { ListMusic, Loader2 } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import { Navbar } from '@/components/layout/Navbar';
import { ShareButton } from '@/components/tracks/ShareButton';
import { TrackDescription } from '@/components/tracks/TrackDescription';

export function PlaylistPage() {
  const { shareableId } = useParams<{ shareableId: string }>();
  const playlist = useQuery(
    api.playlists.getByShareableId,
    shareableId ? { shareableId } : 'skip'
  );

  if (playlist === undefined) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-studio-accent" />
        </div>
      </div>
    );
  }

  if (playlist === null) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">Playlist Not Found</h1>
          <p className="text-studio-text-secondary mb-6">
            This playlist doesn&apos;t exist or has been deleted.
          </p>
          <Link to="/" className="text-studio-accent hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = playlist.viewerRole === 'owner';

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-8 max-w-4xl">
        <div className="mb-4 sm:mb-6">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <p className="mono text-xs uppercase tracking-wider text-studio-text-secondary mb-1">
                Playlist
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight line-clamp-2 break-words">
                {playlist.title}
              </h1>
              <p className="mt-1 text-sm text-studio-text-secondary truncate">
                {playlist.creatorName}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ShareButton shareableId={playlist.shareableId} kind="playlist" />
            </div>
          </div>
          {playlist.description && (
            <TrackDescription description={playlist.description} className="mt-2" />
          )}
        </div>

        <div className="card text-center py-12">
          <ListMusic className="w-16 h-16 mx-auto mb-4 text-studio-gray" />
          <p className="text-studio-text-secondary">
            {isOwner
              ? 'This playlist is empty. Add tracks to it from a track’s menu.'
              : 'This playlist is empty.'}
          </p>
        </div>
      </main>
    </div>
  );
}
