import { Link } from 'react-router-dom';
import { Clock, User, Lock, Globe, Link2, Play, Pause } from 'lucide-react';
import { usePlayer } from '@/hooks/usePlayer';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { Track } from '@/types';

interface TrackCardProps {
  track: Track;
  /** The list this card sits in; pressing play queues it from this track on. */
  list?: Track[];
  showPrivacyBadge?: boolean;
}

export function TrackCard({ track, list, showPrivacyBadge }: TrackCardProps) {
  const player = usePlayer();
  const isCurrent = player.current?.trackId === track._id;
  const isPlaying = isCurrent && player.isPlaying;
  const canPlay = !!track.latestVersionId;

  const handlePlay = () => {
    if (isCurrent) player.toggle();
    else player.playFrom(list ?? [track], track._id);
  };

  return (
    <div
      className={cn(
        'card relative hover:scale-105 transition-transform',
        isCurrent && 'border-studio-accent'
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <button
          onClick={handlePlay}
          disabled={!canPlay}
          aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          title={canPlay ? undefined : 'No audio yet'}
          className="relative z-10 shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-studio-accent hover:bg-studio-accent/90 transition-colors disabled:bg-studio-gray disabled:cursor-not-allowed"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg mb-1 line-clamp-1">
            {/* Stretched link: the whole card opens the track, except the play button */}
            <Link to={`/track/${track.shareableId}`} className="after:absolute after:inset-0 after:content-['']">
              {track.title}
            </Link>
          </h3>
          <p className="text-sm text-studio-text-secondary flex items-center">
            <User className="w-3 h-3 mr-1" />
            {track.creatorName}
          </p>
        </div>
        {showPrivacyBadge && (
          <span className="flex items-center gap-1 text-xs text-studio-text-secondary">
            {track.visibility === "public" && <Globe className="w-3 h-3" />}
            {track.visibility === "unlisted" && <Link2 className="w-3 h-3" />}
            {track.visibility === "private" && <Lock className="w-3 h-3" />}
            {track.visibility === "public" ? "Public" : track.visibility === "unlisted" ? "Unlisted" : "Private"}
          </span>
        )}
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
    </div>
  );
}
