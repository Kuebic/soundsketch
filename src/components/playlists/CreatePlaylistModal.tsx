import { useState, type FormEvent } from 'react';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { PlaylistId } from '@/types';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the new playlist once it exists. */
  onCreated?: (playlist: { playlistId: PlaylistId; shareableId: string; title: string }) => void;
}

export function CreatePlaylistModal({ isOpen, onClose, onCreated }: CreatePlaylistModalProps) {
  const createPlaylist = useMutation(api.playlists.create);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Not dismissable mid-save: the pending request would still close and
  // navigate from under whatever the user opened next.
  const handleClose = () => {
    if (saving) return;
    setTitle('');
    setDescription('');
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    try {
      setSaving(true);
      const created = await createPlaylist({ title, description: description || undefined });
      toast.success('Playlist created');
      setSaving(false);
      setTitle('');
      setDescription('');
      onClose();
      onCreated?.({ ...created, title: title.trim() });
    } catch {
      toast.error('Failed to create playlist');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Playlist" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="playlist-title" className="block text-sm font-medium mb-1.5">
            Title
          </label>
          <input
            id="playlist-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Demos for Sam"
            maxLength={200}
            className="input w-full"
            autoFocus
            required
          />
        </div>
        <div>
          <label htmlFor="playlist-description" className="block text-sm font-medium mb-1.5">
            Description <span className="text-studio-text-secondary font-normal">(optional)</span>
          </label>
          <textarea
            id="playlist-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What should listeners know?"
            className="input w-full resize-y min-h-[5rem]"
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!title.trim() || saving}>
            {saving ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
