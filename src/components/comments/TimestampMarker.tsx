import { useState } from 'react';
import { MessageCircle } from 'lucide-react';

interface TimestampMarkerProps {
  timestamp: number;
  duration: number;
  authorName: string;
  commentPreview: string;
  onClick: () => void;
}

export function TimestampMarker({
  timestamp,
  duration,
  authorName,
  commentPreview,
  onClick,
}: TimestampMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const leftPercent = duration > 0 ? (timestamp / duration) * 100 : 0;

  return (
    <div
      className="absolute top-0 z-10 -translate-x-1/2 cursor-pointer"
      style={{ left: `${leftPercent}%` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div className="w-3 h-3 rounded-full bg-studio-accent-cyan border-2 border-studio-darker hover:scale-125 transition-transform" />

      {hovered && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-studio-darker border border-studio-gray rounded-lg px-3 py-2 min-w-[160px] max-w-[240px] shadow-lg pointer-events-none">
          <div className="flex items-center gap-1 text-xs text-studio-accent-cyan mb-1">
            <MessageCircle className="w-3 h-3" />
            <span className="font-medium">{authorName}</span>
          </div>
          <p className="text-xs text-studio-text-secondary line-clamp-2">
            {commentPreview}
          </p>
        </div>
      )}
    </div>
  );
}
