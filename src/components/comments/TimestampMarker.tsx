import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';

interface TimestampMarkerProps {
  timestamp: number;
  duration: number;
  authorName: string;
  commentPreview: string;
  onClick: () => void;
}

/**
 * A comment pin on the waveform: a dot at the top with a hairline running down
 * through the waveform to the exact moment. Must sit in a positioned overlay
 * that covers the waveform (the hairline fills its height).
 */
export function TimestampMarker({
  timestamp,
  duration,
  authorName,
  commentPreview,
  onClick,
}: TimestampMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const leftPercent = duration > 0 ? (timestamp / duration) * 100 : 0;

  // Keep the tooltip inside the waveform near the edges
  const tooltipAlign =
    leftPercent < 15 ? 'left-0' : leftPercent > 85 ? 'right-0' : 'left-1/2 -translate-x-1/2';

  return (
    <div
      className="absolute inset-y-0 z-10 -translate-x-1/2 pointer-events-none"
      style={{ left: `${leftPercent}%` }}
    >
      {/* Hairline anchoring the marker to its moment */}
      <div
        className={cn(
          'absolute left-1/2 top-0 h-full w-px -translate-x-1/2 transition-colors',
          hovered ? 'bg-studio-accent-cyan/80' : 'bg-studio-accent-cyan/40'
        )}
      />

      <button
        type="button"
        className="relative block p-2 -m-2 pointer-events-auto cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent-cyan"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        aria-label={`Play from ${formatDuration(timestamp)}, comment by ${authorName}`}
      >
        <span
          className={cn(
            'block w-3 h-3 rounded-full bg-studio-accent-cyan border-2 border-studio-darker transition-transform',
            hovered && 'scale-125'
          )}
        />
      </button>

      {hovered && (
        <div
          className={cn(
            'absolute bottom-full mb-2 bg-studio-darker border border-studio-gray rounded-lg px-3 py-2 min-w-[160px] max-w-[240px] shadow-lg pointer-events-none',
            tooltipAlign
          )}
        >
          <div className="flex items-center gap-1 text-xs text-studio-accent-cyan mb-1">
            <MessageCircle className="w-3 h-3" />
            <span className="font-medium truncate">{authorName}</span>
            <span className="mono text-studio-text-secondary ml-auto pl-2">{formatDuration(timestamp)}</span>
          </div>
          <p className="text-xs text-studio-text-secondary line-clamp-2">{commentPreview}</p>
        </div>
      )}
    </div>
  );
}
