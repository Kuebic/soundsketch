import { useState, type FormEvent } from 'react';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { PlaylistForViewer } from '@/types';

interface EditPlaylistModalProps {
  onClose: () => void;
  playlist: Pick<PlaylistForViewer, '_id' | 'title' | 'description'>;
}

/** Rename a playlist and edit its description. Mount it only while open. */
export function EditPlaylistModal({ onClose, playlist }: EditPlaylistModalProps) {
  const updatePlaylist = useMutation(api.playlists.update);
  const [title, setTitle] = useState(playlist.title);
  const [description, setDescription] = useState(playlist.description ?? '');
  const [saving, setSaving] = useState(false);

  // Not dismissable mid-save, so a late result cannot close a reopened form.
  const handleClose = () => {
    if (!saving) onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    try {
      setSaving(true);
      await updatePlaylist({ playlistId: playlist._id, title, description });
      toast.success('Playlist updated');
      onClose();
    } catch {
      toast.error('Failed to update playlist');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={handleClose} title="Edit Playlist" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="edit-playlist-title" className="block text-sm font-medium mb-1.5">
            Title
          </label>
          <input
            id="edit-playlist-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="input w-full"
            required
          />
        </div>
        <div>
          <label htmlFor="edit-playlist-description" className="block text-sm font-medium mb-1.5">
            Description <span className="text-studio-text-secondary font-normal">(optional)</span>
          </label>
          <textarea
            id="edit-playlist-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input w-full resize-y min-h-[5rem]"
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!title.trim() || saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
