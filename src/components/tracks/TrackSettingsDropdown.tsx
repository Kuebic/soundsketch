import { useEffect, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ManageCollaboratorsModal } from './ManageCollaboratorsModal';
import { Settings, Globe, Lock, Link2, Trash2, Users, Download, X } from 'lucide-react';
import type { Track } from '@/types';

interface TrackSettingsDropdownProps {
  track: Track;
}

export function TrackSettingsDropdown({ track }: TrackSettingsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const updateSettings = useMutation(api.tracks.updateSettings);
  const deleteTrack = useMutation(api.tracks.deleteTrack);

  const downloadsEnabled = track.downloadsEnabled ?? false;

  useEffect(() => {
    if (!open) return;
    const getItems = () =>
      Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    getItems()[0]?.focus();

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setOpen(false);
        return;
      }
      const items = getItems();
      const idx = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === 'ArrowDown' && items.length > 0) {
        e.preventDefault();
        items[(idx + 1) % items.length]?.focus();
      } else if (e.key === 'ArrowUp' && items.length > 0) {
        e.preventDefault();
        items[idx <= 0 ? items.length - 1 : idx - 1]?.focus();
      } else if (e.key === 'Home' && items.length > 0) {
        e.preventDefault();
        items[0]?.focus();
      } else if (e.key === 'End' && items.length > 0) {
        e.preventDefault();
        items[items.length - 1]?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleVisibilityChange = async (newVisibility: "public" | "unlisted" | "private") => {
    try {
      await updateSettings({ trackId: track._id, visibility: newVisibility });
      toast.success(`Track set to ${newVisibility}`);
      setOpen(false);
    } catch {
      toast.error('Failed to update visibility');
    }
  };

  const handleDownloadsToggle = async () => {
    try {
      await updateSettings({ trackId: track._id, downloadsEnabled: !downloadsEnabled });
      toast.success(downloadsEnabled ? 'Downloads disabled' : 'Downloads enabled');
      setOpen(false);
    } catch {
      toast.error('Failed to update download settings');
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteTrack({ trackId: track._id });
      toast.success('Track deleted');
      navigate('/');
    } catch {
      toast.error('Failed to delete track');
      setDeleting(false);
    }
  };

  const itemClass =
    'w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-studio-dark text-left focus-visible:outline-none focus-visible:bg-studio-dark focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-studio-accent';

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Track settings"
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium bg-studio-darker border border-studio-gray text-white hover:border-studio-accent/50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent focus-visible:ring-offset-2 focus-visible:ring-offset-studio-black"
      >
        <Settings className="w-4 h-4" />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Track settings"
          className="absolute right-0 top-full mt-2 w-48 bg-studio-darker border border-studio-gray rounded-lg shadow-xl shadow-black/40 z-50 overflow-hidden"
        >
          {([
            { value: "public" as const, label: "Make Public", Icon: Globe },
            { value: "unlisted" as const, label: "Make Unlisted", Icon: Link2 },
            { value: "private" as const, label: "Make Private", Icon: Lock },
          ])
            .filter(({ value }) => value !== track.visibility)
            .map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                tabIndex={-1}
                onClick={() => handleVisibilityChange(value)}
                role="menuitem"
                className={itemClass}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          <button
            type="button"
            tabIndex={-1}
            onClick={handleDownloadsToggle}
            role="menuitem"
            className={itemClass}
          >
            {downloadsEnabled ? (
              <>
                <span className="relative">
                  <Download className="w-4 h-4" />
                  <X className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-red-400" />
                </span>
                Disable Downloads
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Enable Downloads
              </>
            )}
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => { setOpen(false); setShowCollaborators(true); }}
            role="menuitem"
            className={itemClass}
          >
            <Users className="w-4 h-4" />
            Manage Collaborators
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => { setOpen(false); setShowDeleteConfirm(true); }}
            role="menuitem"
            className={`${itemClass} text-red-400`}
          >
            <Trash2 className="w-4 h-4" />
            Delete Track
          </button>
        </div>
      )}

      {/* Manage Collaborators */}
      <ManageCollaboratorsModal
        isOpen={showCollaborators}
        onClose={() => setShowCollaborators(false)}
        trackId={track._id}
      />

      {/* Delete confirmation */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Track" size="sm">
        <p className="text-sm text-studio-text-secondary mb-6">
          Are you sure you want to delete <strong>{track.title}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
