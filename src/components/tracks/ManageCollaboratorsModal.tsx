import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatRelativeTime } from '@/lib/utils';
import { Search, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import type { TrackId } from '@/types';

interface ManageCollaboratorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: TrackId;
}

export function ManageCollaboratorsModal({ isOpen, onClose, trackId }: ManageCollaboratorsModalProps) {
  const [searchEmail, setSearchEmail] = useState('');
  const [searchSubmitted, setSearchSubmitted] = useState('');
  const [granting, setGranting] = useState(false);

  const collaborators = useQuery(api.tracks.getCollaborators, { trackId });
  const foundUser = useQuery(
    api.users.searchByEmail,
    searchSubmitted ? { email: searchSubmitted } : 'skip'
  );
  const grantAccess = useMutation(api.tracks.grantAccess);
  const revokeAccess = useMutation(api.tracks.revokeAccess);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;
    setSearchSubmitted(searchEmail.trim());
  };

  const handleGrant = async () => {
    if (!foundUser) return;
    try {
      setGranting(true);
      await grantAccess({ trackId, userId: foundUser._id });
      toast.success(`Access granted to ${foundUser.name}`);
      setSearchEmail('');
      setSearchSubmitted('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to grant access');
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (userId: typeof foundUser extends null ? never : NonNullable<typeof foundUser>['_id']) => {
    try {
      await revokeAccess({ trackId, userId });
      toast.success('Access revoked');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke access');
    }
  };

  // Check if found user already has access
  const alreadyHasAccess = foundUser && collaborators?.some((c) => c.userId === foundUser._id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Collaborators" size="md">
      <div className="space-y-6">
        {/* Search & Invite */}
        <form onSubmit={handleSearch} className="space-y-3">
          <label className="block text-sm font-medium">Invite by email</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-studio-text-secondary" />
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="collaborator@email.com"
                className="input w-full pl-10"
              />
            </div>
            <Button type="submit" variant="secondary" size="md" disabled={!searchEmail.trim()}>
              Search
            </Button>
          </div>

          {/* Search result */}
          {searchSubmitted && foundUser === null && (
            <p className="text-sm text-studio-text-secondary">No user found with this email.</p>
          )}

          {foundUser && (
            <div className="flex items-center justify-between bg-studio-dark border border-studio-gray rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-medium">{foundUser.name}</p>
                <p className="text-xs text-studio-text-secondary">{foundUser.email}</p>
              </div>
              {alreadyHasAccess ? (
                <span className="text-xs text-studio-text-secondary">Already has access</span>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleGrant}
                  disabled={granting}
                >
                  {granting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-1" />
                      Grant Access
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </form>

        {/* Collaborator list */}
        <div>
          <h3 className="text-sm font-medium mb-3">
            Collaborators {collaborators && `(${collaborators.length})`}
          </h3>

          {collaborators === undefined ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-studio-text-secondary" />
            </div>
          ) : collaborators.length === 0 ? (
            <p className="text-sm text-studio-text-secondary py-4 text-center">
              No collaborators yet. Invite someone by email above.
            </p>
          ) : (
            <div className="space-y-2">
              {collaborators.map((collab) => (
                <div
                  key={collab._id}
                  className="flex items-center justify-between bg-studio-dark border border-studio-gray rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{collab.userName}</p>
                    <p className="text-xs text-studio-text-secondary">
                      {collab.userEmail} · Added {formatRelativeTime(collab.grantedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRevoke(collab.userId)}
                    className="text-studio-text-secondary hover:text-red-400 p-1"
                    title="Remove access"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
