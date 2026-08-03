import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface TrackDescriptionProps {
  description: string;
  className?: string;
}

/**
 * Renders a track description with newlines preserved (lyrics, verse breaks).
 * Collapsed to 4 lines with a Show more/less toggle when it overflows.
 */
export function TrackDescription({ description, className }: TrackDescriptionProps) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  const measure = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    // Only meaningful while clamped; expanded text never overflows its own box.
    if (expanded) return;
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [expanded]);

  useEffect(() => {
    measure();
    const el = textRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, description]);

  return (
    <div className={className}>
      <p
        ref={textRef}
        className={cn(
          'text-sm text-studio-text-secondary whitespace-pre-wrap break-words',
          !expanded && 'line-clamp-4'
        )}
      >
        {description}
      </p>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1 text-xs font-medium text-studio-accent hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}
