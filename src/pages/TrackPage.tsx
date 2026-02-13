import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Navbar } from '@/components/layout/Navbar';
import { TrackPlayer } from '@/components/audio/TrackPlayer';
import { VersionSelector } from '@/components/tracks/VersionSelector';
import { ShareButton } from '@/components/tracks/ShareButton';
import { TrackSettingsDropdown } from '@/components/tracks/TrackSettingsDropdown';
import { AddVersionModal } from '@/components/tracks/AddVersionModal';
import { CommentForm } from '@/components/comments/CommentForm';
import { CommentList } from '@/components/comments/CommentList';
import { Button } from '@/components/ui/Button';
import { formatDuration } from '@/lib/utils';
import { Loader2, Globe, Lock, Plus, X, Clock, MessageCircle, Layers } from 'lucide-react';
import type { VersionId } from '@/types';

export function TrackPage() {
  const { shareableId } = useParams<{ shareableId: string }>();
  const [selectedVersionId, setSelectedVersionId] = useState<VersionId | null>(null);
  const [timestampForComment, setTimestampForComment] = useState<number | null>(null);
  const [seekToTime, setSeekToTime] = useState<number | null>(null);
  const [showAddVersion, setShowAddVersion] = useState(false);
  const [showAllVersions, setShowAllVersions] = useState(false);

  // Data fetching
  const track = useQuery(api.tracks.getByShareableId, shareableId ? { shareableId } : 'skip');
  const viewer = useQuery(api.users.viewer);
  const versions = useQuery(
    api.versions.getByTrack,
    track ? { trackId: track._id } : 'skip'
  );
  const timestampComments = useQuery(
    api.comments.getTimestampComments,
    selectedVersionId ? { versionId: selectedVersionId, includeAllVersions: showAllVersions } : 'skip'
  );
  const generalComments = useQuery(
    api.comments.getGeneralComments,
    selectedVersionId ? { versionId: selectedVersionId, includeAllVersions: showAllVersions } : 'skip'
  );

  // Set initial selected version when versions load
  useEffect(() => {
    if (versions && versions.length > 0 && !selectedVersionId) {
      setSelectedVersionId(versions[0]._id);
    }
  }, [versions, selectedVersionId]);

  // Reset selected version when switching tracks
  useEffect(() => {
    setSelectedVersionId(null);
  }, [shareableId]);

  const isOwner = viewer && track ? viewer._id === track.creatorId : false;
  const selectedVersion = versions?.find((v) => v._id === selectedVersionId);

  // Build timestamp markers for the player
  const playerTimestampComments = timestampComments?.map((c) => ({
    id: c._id,
    timestamp: c.timestamp!,
    authorName: c.authorName,
    commentPreview: c.commentText.slice(0, 60),
  }));

  // Loading state
  if (track === undefined) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-studio-accent" />
        </div>
      </div>
    );
  }

  // Track not found or no access
  if (track === null) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">Track Not Found</h1>
          <p className="text-studio-text-secondary mb-6">
            This track doesn&apos;t exist or you don&apos;t have permission to view it.
          </p>
          <Link to="/login" className="text-studio-accent hover:underline">
            Sign in to access private tracks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Track Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold mb-1 truncate">{track.title}</h1>
              <p className="text-studio-text-secondary">{track.creatorName}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex items-center gap-1 text-xs text-studio-text-secondary">
                {track.isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {track.isPublic ? 'Public' : 'Private'}
              </span>
              <ShareButton shareableId={track.shareableId} />
              {isOwner && <TrackSettingsDropdown track={track} />}
            </div>
          </div>
          {track.description && (
            <p className="text-sm text-studio-text-secondary mt-2">{track.description}</p>
          )}
        </div>

        {/* Version Selector */}
        {versions && versions.length > 0 && selectedVersionId && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <VersionSelector
                versions={versions}
                currentVersionId={selectedVersionId}
                onVersionChange={setSelectedVersionId}
              />
              {isOwner && (
                <Button variant="secondary" size="sm" onClick={() => setShowAddVersion(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  New Version
                </Button>
              )}
            </div>
            {versions.length > 1 && (
              <label className="flex items-center gap-2 text-sm text-studio-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAllVersions}
                  onChange={(e) => setShowAllVersions(e.target.checked)}
                  className="accent-studio-accent"
                />
                <Layers className="w-4 h-4" />
                Show comments from all versions
              </label>
            )}
          </div>
        )}

        {/* Player */}
        {selectedVersion ? (
          <div className="mb-8">
            <TrackPlayer
              r2Key={selectedVersion.r2Key}
              onTimestampClick={(ts) => setTimestampForComment(ts)}
              timestampComments={playerTimestampComments}
              seekToTime={seekToTime}
              onSeekComplete={() => setSeekToTime(null)}
            />
          </div>
        ) : versions === undefined ? (
          <div className="card flex items-center justify-center py-12 mb-8">
            <Loader2 className="w-6 h-6 animate-spin text-studio-text-secondary" />
          </div>
        ) : (
          <div className="card text-center py-12 mb-8">
            <p className="text-studio-text-secondary">
              {isOwner ? 'Upload a version to start playing.' : 'No versions uploaded yet.'}
            </p>
            {isOwner && (
              <Button variant="primary" size="sm" className="mt-4" onClick={() => setShowAddVersion(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Upload First Version
              </Button>
            )}
          </div>
        )}

        {/* Timestamp Comment Form (when waveform is clicked) */}
        {timestampForComment !== null && selectedVersionId && (
          <div className="card mb-6 border border-studio-accent/30">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-sm text-studio-accent-cyan mono">
                <Clock className="w-4 h-4" />
                Comment at {formatDuration(timestampForComment)}
              </span>
              <button onClick={() => setTimestampForComment(null)} className="text-studio-text-secondary hover:text-studio-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <CommentForm
              versionId={selectedVersionId}
              trackId={track._id}
              timestamp={timestampForComment}
              onSubmit={() => setTimestampForComment(null)}
              onCancel={() => setTimestampForComment(null)}
              placeholder="Add feedback at this timestamp..."
            />
          </div>
        )}

        {selectedVersionId && (
          <>
            {/* Timestamp Comments Section */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-studio-accent-cyan" />
                Timestamp Comments
              </h2>
              <CommentList
                comments={timestampComments}
                currentUserId={viewer?._id}
                isTrackOwner={isOwner}
                onTimestampClick={(ts) => setSeekToTime(ts)}
                versionId={selectedVersionId}
                trackId={track._id}
                emptyMessage="Click on the waveform to add timestamp-specific feedback."
              />
            </section>

            {/* General Discussion Section */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-studio-accent" />
                Discussion
              </h2>
              <div className="mb-4">
                <CommentForm
                  versionId={selectedVersionId}
                  trackId={track._id}
                  placeholder="Add to the discussion..."
                />
              </div>
              <CommentList
                comments={generalComments}
                currentUserId={viewer?._id}
                isTrackOwner={isOwner}
                versionId={selectedVersionId}
                trackId={track._id}
                emptyMessage="No comments yet. Start the discussion!"
              />
            </section>
          </>
        )}
      </main>

      {/* Add Version Modal */}
      {track && (
        <AddVersionModal
          isOpen={showAddVersion}
          onClose={() => setShowAddVersion(false)}
          trackId={track._id}
        />
      )}
    </div>
  );
}
