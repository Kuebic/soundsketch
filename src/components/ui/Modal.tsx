import { ReactNode, RefObject, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Where focus goes when the dialog closes. Defaults to whatever had focus
   * when it opened; pass this when that element will be gone by then (a menu
   * item, a dialog this one replaces).
   */
  returnFocusTo?: RefObject<HTMLElement | null>;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Open dialogs, bottom to top. Only the top one answers the keyboard. */
const openDialogs: symbol[] = [];
let overflowBeforeLock = '';

function isVisible(el: HTMLElement): boolean {
  return el.getClientRects().length > 0;
}

export function Modal({ isOpen, onClose, title, children, size = 'md', returnFocusTo }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const returnFocusToRef = useRef(returnFocusTo);
  returnFocusToRef.current = returnFocusTo;

  // Note the opener while rendering the open transition: by the time effects
  // run, an autoFocus field inside the dialog has already taken focus.
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  if (isOpen && !wasOpenRef.current) {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  wasOpenRef.current = isOpen;

  // While open: lock page scroll, close on ESC, keep Tab inside the dialog,
  // and hand focus back afterwards.
  useEffect(() => {
    if (!isOpen) return;
    const id = Symbol('dialog');
    const panel = panelRef.current;
    const isTop = () => openDialogs[openDialogs.length - 1] === id;

    if (openDialogs.length === 0) {
      overflowBeforeLock = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openDialogs.push(id);

    if (panel && !panel.contains(document.activeElement)) {
      // A form's first visible field if there is one, otherwise the dialog itself.
      const field = Array.from(panel.querySelectorAll<HTMLElement>('input:not([disabled]), textarea:not([disabled])')).find(isVisible);
      field?.focus();
      if (!panel.contains(document.activeElement)) panel.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === 'Escape') {
        // Stop here so a dialog underneath does not close on the same press.
        e.stopImmediatePropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isVisible);
      if (focusable.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!panel.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const wasTop = isTop();
      openDialogs.splice(openDialogs.indexOf(id), 1);
      if (openDialogs.length === 0) document.body.style.overflow = overflowBeforeLock;
      const target = returnFocusToRef.current?.current ?? openerRef.current;
      if (wasTop && target?.isConnected) target.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  // Portalled to <body> so a transformed ancestor (a hovered card) cannot
  // become the containing block of the fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative focus:outline-none bg-studio-darker border border-studio-gray rounded-xl shadow-2xl w-full animate-slide-up',
          sizeStyles[size]
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-studio-gray">
            <h2 className="text-xl font-bold">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1 hover:bg-studio-dark rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
