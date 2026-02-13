import { useState } from 'react';
import { useMutation } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../convex/_generated/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Settings, Globe, Lock, Trash2 } from 'lucide-react';
import type { Track } from '@/types';

interface TrackSettingsDropdownProps {
  track: Track;
}

export function TrackSettingsDropdown({ track }: TrackSettingsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();
  const updatePrivacy = useMutation(api.tracks.updatePrivacy);
  const deleteTrack = useMutation(api.tracks.deleteTrack);

  const handlePrivacyToggle = async () => {
    await updatePrivacy({ trackId: track._id, isPublic: !track.isPublic });
    setOpen(false);
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteTrack({ trackId: track._id });
      navigate('/');
    } catch {
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
            <button
              onClick={handlePrivacyToggle}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-studio-dark text-left"
            >
              {track.isPublic ? (
                <>
                  <Lock className="w-4 h-4" />
                  Make Private
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  Make Public
                </>
              )}
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
