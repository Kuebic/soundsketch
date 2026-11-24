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

const visibilityBadge = {
  public: { label: 'Public', Icon: Globe },
  unlisted: { label: 'Unlisted', Icon: Link2 },
  private: { label: 'Private', Icon: Lock },
} as const;

export function TrackCard({ track, list, showPrivacyBadge }: TrackCardProps) {
  const player = usePlayer();
  const isCurrent = player.current?.trackId === track._id;
  const isPlaying = isCurrent && player.isPlaying;
  const canPlay = !!track.latestVersionId;
  const badge = visibilityBadge[track.visibility];

  const handlePlay = () => {
    if (isCurrent) player.toggle();
    else player.playFrom(list ?? [track], track._id);
  };

  return (
    <div
      className={cn(
        'card relative flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-studio-accent/50',
        isCurrent && 'border-studio-accent'
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={handlePlay}
          disabled={!canPlay}
          aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          title={canPlay ? undefined : 'No audio yet'}
          className={cn(
            'relative z-10 shrink-0 w-10 h-10 flex items-center justify-center rounded-full',
            'bg-studio-accent text-white hover:bg-studio-accent/90 transition-colors',
            'disabled:bg-studio-gray disabled:cursor-not-allowed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent focus-visible:ring-offset-2 focus-visible:ring-offset-studio-darker'
          )}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg leading-snug mb-1 line-clamp-1">
            {/* Stretched link: the whole card opens the track, except the play button */}
            <Link
              to={`/track/${track.shareableId}`}
              className="after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-studio-accent"
            >
              {track.title}
            </Link>
          </h3>
          <p className="text-sm text-studio-text-secondary flex items-center min-w-0">
            <User className="w-3 h-3 mr-1 shrink-0" />
            <span className="truncate">{track.creatorName}</span>
          </p>
        </div>
      </div>

      {track.description && (
        <p className="text-sm text-studio-text-secondary mt-3 line-clamp-2">
          {track.description}
        </p>
      )}

      <div className="mt-auto pt-3 flex items-center justify-between gap-2 text-xs text-studio-text-secondary">
        <span className="flex items-center mono">
          <Clock className="w-3 h-3 mr-1" />
          {formatRelativeTime(track._creationTime)}
        </span>
        {showPrivacyBadge && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-studio-dark border border-studio-gray text-[11px] text-studio-text-secondary">
            <badge.Icon className="w-3 h-3" />
            {badge.label}
          </span>
        )}
      </div>
    </div>
  );
}
