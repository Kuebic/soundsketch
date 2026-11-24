import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { ConvexError } from 'convex/values';
import { toast } from 'sonner';
import { ListMusic, Loader2, Plus } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { Modal } from '@/components/ui/Modal';
import { CreatePlaylistModal } from './CreatePlaylistModal';
import type { PlaylistId, TrackId } from '@/types';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: { _id: TrackId; title: string };
}

const rowClass =
  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm hover:bg-studio-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent';

/** Pick one of the signed-in user's playlists, or start a new one, for a track. */
export function AddToPlaylistModal({ isOpen, onClose, track }: AddToPlaylistModalProps) {
  const playlists = useQuery(api.playlists.getMyPlaylists, isOpen ? {} : 'skip');
  const addTrack = useMutation(api.playlists.addTrack);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleAdd = async (playlistId: PlaylistId, playlistTitle: string) => {
    if (adding) return;
    try {
      setAdding(true);
      await addTrack({ playlistId, trackId: track._id });
      toast.success(`Added to ${playlistTitle}`);
      onClose();
    } catch (error) {
      const code =
        error instanceof ConvexError ? (error.data as { code?: string } | null)?.code : undefined;
      if (code === 'already_in_playlist') {
        toast.error(`Already in ${playlistTitle}`);
      } else if (code === 'playlist_full') {
        toast.error(`${playlistTitle} is full`);
      } else {
        toast.error('Failed to add to playlist');
      }
    } finally {
      setAdding(false);
    }
  };

  // Not dismissable mid-add: the pending request would close a reopened picker.
  const handleClose = () => {
    if (!adding) onClose();
  };

  if (creating) {
    return (
      <CreatePlaylistModal
        isOpen={isOpen}
        onClose={() => setCreating(false)}
        onCreated={({ playlistId, title }) => {
          setCreating(false);
          void handleAdd(playlistId, title);
        }}
      />
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add to Playlist" size="sm">
      <p className="text-sm text-studio-text-secondary mb-4 truncate">{track.title}</p>
      {playlists === undefined ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-studio-text-secondary" />
        </div>
      ) : (
        <ul className="max-h-72 overflow-y-auto -mx-1 px-1 space-y-0.5">
          {playlists.map((playlist) => (
            <li key={playlist._id}>
              <button
                type="button"
                className={rowClass}
                disabled={adding}
                onClick={() => handleAdd(playlist._id, playlist.title)}
              >
                <ListMusic className="w-4 h-4 shrink-0 text-studio-text-secondary" />
                <span className="flex-1 min-w-0 truncate">{playlist.title}</span>
                <span className="mono text-xs text-studio-text-secondary">{playlist.trackCount}</span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className={`${rowClass} text-studio-accent`}
              disabled={adding}
              onClick={() => setCreating(true)}
            >
              <Plus className="w-4 h-4 shrink-0" />
              New playlist
            </button>
          </li>
        </ul>
      )}
    </Modal>
  );
}
