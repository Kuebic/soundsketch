import { Link } from 'react-router-dom';
import { Clock, User, Lock, Globe, Link2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { Track } from '@/types';

interface TrackCardProps {
  track: Track;
  showPrivacyBadge?: boolean;
}

export function TrackCard({ track, showPrivacyBadge }: TrackCardProps) {
  return (
    <Link
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
    </Link>
  );
}
