import { useEffect } from 'react';

interface UseKeyboardShortcutsOptions {
  onPlayPause: () => void;
  onSeekForward?: () => void;
  onSeekBackward?: () => void;
}

export function useKeyboardShortcuts({
  onPlayPause,
  onSeekForward,
  onSeekBackward,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement).isContentEditable) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          onPlayPause();
          break;
        case 'ArrowRight':
          e.preventDefault();
          onSeekForward?.();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onSeekBackward?.();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onPlayPause, onSeekForward, onSeekBackward]);
}
