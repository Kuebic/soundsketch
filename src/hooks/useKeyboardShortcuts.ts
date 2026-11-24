import { useEffect } from 'react';

interface UseKeyboardShortcutsOptions {
  onPlayPause: () => void;
  onSeekForward?: () => void;
  onSeekBackward?: () => void;
}

const INTERACTIVE_SELECTOR = [
  'input',
  'textarea',
  'select',
  'button',
  'a[href]',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="slider"]',
  '[role="switch"]',
  '[role="radio"]',
  '[role="checkbox"]',
  '[role="menuitem"]',
  '[role="listbox"]',
  '[role="option"]',
  '[role="tab"]',
  // A modal owns the keyboard while it is open.
  '[role="dialog"]',
].join(',');

export function useKeyboardShortcuts({
  onPlayPause,
  onSeekForward,
  onSeekBackward,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || target.closest(INTERACTIVE_SELECTOR))) {
        return;
      }

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
