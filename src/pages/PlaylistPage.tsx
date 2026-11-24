import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { EyeOff, ListMusic, Loader2 } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import { Navbar } from '@/components/layout/Navbar';
import { ShareButton } from '@/components/tracks/ShareButton';
import { TrackDescription } from '@/components/tracks/TrackDescription';
import { formatDuration } from '@/lib/utils';

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
  const { tracks, hiddenCount } = playlist;
  const totalDuration = tracks.reduce((sum, track) => sum + (track.duration ?? 0), 0);

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
                {tracks.length > 0 && (
                  <span className="mono">
                    {' · '}
                    {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
                    {' · '}
                    {formatDuration(totalDuration)}
                  </span>
                )}
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

        {tracks.length === 0 ? (
          <div className="card text-center py-12">
            <ListMusic className="w-16 h-16 mx-auto mb-4 text-studio-gray" />
            <p className="text-studio-text-secondary">
              {hiddenCount > 0
                ? 'You don’t have access to any of the tracks in this playlist.'
                : isOwner
                  ? 'This playlist is empty. Add tracks with “Add to playlist” on a track.'
                  : 'This playlist is empty.'}
            </p>
          </div>
        ) : (
          <ol className="card p-0 divide-y divide-studio-gray overflow-hidden">
            {tracks.map((track, index) => (
              <li key={track._id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                <span className="mono w-6 shrink-0 text-right text-xs text-studio-text-secondary">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/track/${track.shareableId}`}
                    className="block truncate font-medium hover:text-studio-accent focus-visible:outline-none focus-visible:text-studio-accent"
                  >
                    {track.title}
                  </Link>
                  <p className="truncate text-xs text-studio-text-secondary">{track.creatorName}</p>
                </div>
                <span className="mono shrink-0 text-xs text-studio-text-secondary">
                  {track.duration === null ? 'No audio' : formatDuration(track.duration)}
                </span>
              </li>
            ))}
          </ol>
        )}

        {hiddenCount > 0 && (
          <p className="mt-3 flex items-center gap-2 text-sm text-studio-text-secondary">
            <EyeOff className="w-4 h-4 shrink-0" />
            {hiddenCount} {hiddenCount === 1 ? 'track is' : 'tracks are'} unavailable to you. Ask{' '}
            {playlist.creatorName} for access.
          </p>
        )}
      </main>
    </div>
  );
}
