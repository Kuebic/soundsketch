import { useState } from 'react';
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

  const navigate = useNavigate();
  const updateVisibility = useMutation(api.tracks.updateVisibility);
  const updateDownloadsEnabled = useMutation(api.tracks.updateDownloadsEnabled);
  const deleteTrack = useMutation(api.tracks.deleteTrack);

  const downloadsEnabled = track.downloadsEnabled ?? false;

  const handleVisibilityChange = async (newVisibility: "public" | "unlisted" | "private") => {
    try {
      await updateVisibility({ trackId: track._id, visibility: newVisibility });
      toast.success(`Track set to ${newVisibility}`);
      setOpen(false);
    } catch {
      toast.error('Failed to update visibility');
    }
  };

  const handleDownloadsToggle = async () => {
    try {
      await updateDownloadsEnabled({ trackId: track._id, enabled: !downloadsEnabled });
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

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(!open)}
      >
        <Settings className="w-4 h-4" />
      </Button>

      {open && (
        <>
          {/* Backdrop to close dropdown */}
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full mt-2 w-48 bg-studio-darker border border-studio-gray rounded-lg shadow-lg z-30 overflow-hidden">
            {([
              { value: "public" as const, label: "Make Public", Icon: Globe },
              { value: "unlisted" as const, label: "Make Unlisted", Icon: Link2 },
              { value: "private" as const, label: "Make Private", Icon: Lock },
            ])
              .filter(({ value }) => value !== track.visibility)
              .map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => handleVisibilityChange(value)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-studio-dark text-left"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            <button
              onClick={handleDownloadsToggle}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-studio-dark text-left"
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
              onClick={() => { setOpen(false); setShowCollaborators(true); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-studio-dark text-left"
            >
              <Users className="w-4 h-4" />
              Manage Collaborators
            </button>
            <button
              onClick={() => { setOpen(false); setShowDeleteConfirm(true); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-studio-dark text-red-400 text-left"
            >
              <Trash2 className="w-4 h-4" />
              Delete Track
            </button>
          </div>
        </>
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
