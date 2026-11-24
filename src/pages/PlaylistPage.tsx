import { useRef, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { AlertTriangle, ArrowDown, ArrowUp, EyeOff, ListMusic, Loader2, Pause, Pencil, Play, Trash2, X } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import { Navbar } from '@/components/layout/Navbar';
import { ShareButton } from '@/components/tracks/ShareButton';
import { TrackDescription } from '@/components/tracks/TrackDescription';
import { DeletePlaylistModal } from '@/components/playlists/DeletePlaylistModal';
import { EditPlaylistModal } from '@/components/playlists/EditPlaylistModal';
import { Button } from '@/components/ui/Button';
import { usePlayer } from '@/hooks/usePlayer';
import { isQueueFrom } from '@/lib/queue';
import { cn, formatDuration } from '@/lib/utils';
import type { TrackId } from '@/types';

const rowActionClass =
  'p-1.5 rounded-lg text-studio-text-secondary hover:text-white hover:bg-studio-dark transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-studio-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent';

export function PlaylistPage() {
  const player = usePlayer();
  const moveTrack = useMutation(api.playlists.moveTrack);
  const removeTrack = useMutation(api.playlists.removeTrack);
  const updateTrackSettings = useMutation(api.tracks.updateSettings);
  // Holds the id of the playlist being edited, so the form cannot follow a
  // route change to another playlist.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;
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
  // Sent to the owner only; absent for everyone else.
  const privateTracks = playlist.privateTracks ?? [];
  const totalDuration = tracks.reduce((sum, track) => sum + (track.duration ?? 0), 0);

  // The queue is built from this list; it skips tracks with no audio, so
  // Play only has to find the first one that has some.
  const firstPlayable = tracks.find((track) => track.latestVersionId);
  // The queue is ours only if it was started here and still matches the
  // list; the same track may be playing from Home, or the list may have
  // changed since. Then Play starts afresh instead of resuming.
  const source = `playlist:${playlist._id}`;
  const queuedHere = player.source === source && isQueueFrom(player.queue, tracks);
  const canToggle = queuedHere && !player.ended;
  const playingHere = canToggle && player.isPlaying;

  const playlistId = playlist._id;
  const handleMove = async (trackId: TrackId, direction: 'up' | 'down') => {
    try {
      await moveTrack({ playlistId, trackId, direction });
    } catch {
      toast.error('Failed to move track');
    }
  };
  const handleRemove = async (trackId: TrackId, title: string) => {
    try {
      await removeTrack({ playlistId, trackId });
      toast.success(`Removed ${title}`);
    } catch {
      toast.error('Failed to remove track');
    }
  };

  const handleMakeUnlisted = async (trackId: TrackId, title: string) => {
    try {
      await updateTrackSettings({ trackId, visibility: 'unlisted' });
      toast.success(`${title} is now unlisted`);
    } catch {
      toast.error('Failed to update visibility');
    }
  };

  const handlePlayAll = () => {
    if (canToggle) player.toggle();
    else if (firstPlayable) player.playFrom(tracks, firstPlayable._id, source);
  };

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
              {isOwner && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingId(playlist._id)}
                  aria-label="Edit playlist"
                  title="Edit playlist"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              {isOwner && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDeletingId(playlist._id)}
                  aria-label="Delete playlist"
                  title="Delete playlist"
                  className="hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          {playlist.description && (
            <TrackDescription description={playlist.description} className="mt-2" />
          )}
          {firstPlayable && (
            <Button size="lg" onClick={handlePlayAll} className="mt-4 w-full sm:w-auto">
              {playingHere ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {playingHere ? 'Pause' : canToggle ? 'Resume' : 'Play'}
            </Button>
          )}
        </div>

        {privateTracks.length > 0 && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 sm:p-4"
          >
            <p className="flex items-start gap-2 text-sm font-medium text-amber-200">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {privateTracks.length === 1
                ? '1 track is private. People you send this link to won’t see or hear it unless they already have access.'
                : `${privateTracks.length} tracks are private. People you send this link to won’t see or hear them unless they already have access.`}
            </p>
            <ul className="mt-3 space-y-2">
              {privateTracks.map((track) => (
                <li key={track.trackId} className="flex items-center gap-3 text-sm">
                  <span className="flex-1 min-w-0 truncate">{track.title}</span>
                  {track.canMakeUnlisted ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleMakeUnlisted(track.trackId, track.title)}
                    >
                      Make unlisted
                    </Button>
                  ) : (
                    <span className="shrink-0 text-xs text-studio-text-secondary">
                      Owned by {track.creatorName}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

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
            {tracks.map((track, index) => {
              const isCurrent = player.current?.trackId === track._id;
              // Icon, label and action share one condition, so the button never
              // says Pause while a press would restart the track.
              const togglesHere = isCurrent && canToggle;
              const isPlaying = togglesHere && player.isPlaying;
              const canPlay = !!track.latestVersionId;
              return (
                <li
                  key={track._id}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 sm:px-4',
                    isCurrent && 'bg-studio-accent/10'
                  )}
                >
                  <button
                    type="button"
                    onClick={() =>
                      togglesHere ? player.toggle() : player.playFrom(tracks, track._id, source)
                    }
                    disabled={!canPlay}
                    aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                    title={canPlay ? undefined : 'No audio yet'}
                    className={cn(
                      'group shrink-0 w-8 h-8 flex items-center justify-center rounded-full mono text-xs',
                      'text-studio-text-secondary hover:bg-studio-accent hover:text-white transition-colors',
                      'disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-studio-text-secondary',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent',
                      isCurrent && 'bg-studio-accent text-white'
                    )}
                  >
                    {togglesHere ? (
                      isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />
                    ) : canPlay ? (
                      <>
                        <span className="group-hover:hidden group-focus-visible:hidden">{index + 1}</span>
                        <Play className="hidden w-4 h-4 ml-0.5 group-hover:block group-focus-visible:block" />
                      </>
                    ) : (
                      index + 1
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/track/${track.shareableId}`}
                      className={cn(
                        'block truncate font-medium hover:text-studio-accent focus-visible:outline-none focus-visible:text-studio-accent',
                        isCurrent && 'text-studio-accent'
                      )}
                    >
                      {track.title}
                    </Link>
                    <p className="flex min-w-0 text-xs text-studio-text-secondary">
                      <span className="truncate">{track.creatorName}</span>
                      {isOwner && (
                        <span className="mono shrink-0 whitespace-pre sm:hidden">
                          {' · '}
                          {track.duration === null ? 'No audio' : formatDuration(track.duration)}
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'mono shrink-0 text-xs text-studio-text-secondary',
                      isOwner && 'hidden sm:inline'
                    )}
                  >
                    {track.duration === null ? 'No audio' : formatDuration(track.duration)}
                  </span>
                  {isOwner && (
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => handleMove(track._id, 'up')}
                        disabled={index === 0}
                        aria-label={`Move ${track.title} up`}
                        className={rowActionClass}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(track._id, 'down')}
                        disabled={index === tracks.length - 1}
                        aria-label={`Move ${track.title} down`}
                        className={rowActionClass}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(track._id, track.title)}
                        aria-label={`Remove ${track.title} from playlist`}
                        className={cn(rowActionClass, 'hover:text-red-400')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {hiddenCount > 0 && (
          <p className="mt-3 flex items-center gap-2 text-sm text-studio-text-secondary">
            <EyeOff className="w-4 h-4 shrink-0" />
            {hiddenCount} {hiddenCount === 1 ? 'track is' : 'tracks are'} unavailable to you.
          </p>
        )}

        {isOwner && editingId === playlist._id && (
          <EditPlaylistModal playlist={playlist} onClose={() => setEditingId(null)} />
        )}
        {isOwner && deletingId === playlist._id && (
          <DeletePlaylistModal
            playlist={playlist}
            onClose={() => setDeletingId(null)}
            onDeleted={() => {
              // Only if the owner is still here; they may have left mid-delete.
              if (pathRef.current === `/playlist/${playlist.shareableId}`) navigate('/profile');
            }}
          />
        )}
      </main>
    </div>
  );
}
