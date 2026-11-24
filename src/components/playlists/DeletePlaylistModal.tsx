import { useState } from 'react';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { PlaylistId } from '@/types';

interface DeletePlaylistModalProps {
  onClose: () => void;
  playlist: { _id: PlaylistId; title: string };
  /** Called after the playlist is gone, e.g. to leave its page. */
  onDeleted?: () => void;
}

/** Confirm and delete a playlist. Mount it only while open. */
export function DeletePlaylistModal({ onClose, playlist, onDeleted }: DeletePlaylistModalProps) {
  const deletePlaylist = useMutation(api.playlists.deletePlaylist);
  const [deleting, setDeleting] = useState(false);

  const handleClose = () => {
    if (!deleting) onClose();
  };

  const handleDelete = async () => {
    if (deleting) return;
    try {
      setDeleting(true);
      await deletePlaylist({ playlistId: playlist._id });
      toast.success('Playlist deleted');
      onClose();
      onDeleted?.();
    } catch {
      toast.error('Failed to delete playlist');
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen onClose={handleClose} title="Delete Playlist" size="sm">
      <p className="text-sm text-studio-text-secondary mb-6">
        Delete <strong>{playlist.title}</strong>? Its link will stop working. The tracks in it are
        not deleted.
      </p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={handleClose} disabled={deleting}>
          Cancel
        </Button>
        <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>
    </Modal>
  );
}
