import { useState } from 'react';
import { ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import type { TrackId } from '@/types';

interface AddToPlaylistButtonProps {
  track: { _id: TrackId; title: string };
}

/**
 * Icon button that opens the playlist picker for one track. Render it with
 * `key={track._id}` where the track can change under it, so an open picker
 * (or a pending add) never carries over to another track.
 */
export function AddToPlaylistButton({ track }: AddToPlaylistButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Add to playlist"
        title="Add to playlist"
      >
        <ListPlus className="w-4 h-4" />
      </Button>
      <AddToPlaylistModal isOpen={open} onClose={() => setOpen(false)} track={track} />
    </>
  );
}
