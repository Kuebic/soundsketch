import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { ErrorBoundary } from 'react-error-boundary';
import { api } from '../../convex/_generated/api';
import { Navbar } from '@/components/layout/Navbar';
import { TrackPlayer } from '@/components/audio/TrackPlayer';
import { VersionSelector } from '@/components/tracks/VersionSelector';
import { ShareButton } from '@/components/tracks/ShareButton';
import { TrackSettingsDropdown } from '@/components/tracks/TrackSettingsDropdown';
import { AddVersionModal } from '@/components/tracks/AddVersionModal';
import { DownloadButton } from '@/components/tracks/DownloadButton';
import { CommentForm } from '@/components/comments/CommentForm';
import { CommentList } from '@/components/comments/CommentList';
import { Button } from '@/components/ui/Button';
import { PlayerErrorFallback } from '@/components/ui/PlayerErrorFallback';
import { useAnonymousIdentity } from '@/hooks/useAnonymousIdentity';
import { formatDuration } from '@/lib/utils';
import { Loader2, Globe, Lock, Link2, Plus, X, Clock, MessageCircle, Layers } from 'lucide-react';
import type { VersionId } from '@/types';

export function TrackPage() {
  const { shareableId } = useParams<{ shareableId: string }>();
  const location = useLocation();
  const [selectedVersionId, setSelectedVersionId] = useState<VersionId | null>(null);
  const [timestampForComment, setTimestampForComment] = useState<number | null>(null);
  const [seekToTime, setSeekToTime] = useState<number | null>(null);
  const [showAddVersion, setShowAddVersion] = useState(false);
  const [showAllVersions, setShowAllVersions] = useState(false);

  // Anonymous identity for non-logged-in users
  const anonymousIdentity = useAnonymousIdentity();

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
          <Link to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} className="text-studio-accent hover:underline">
            Sign in to access private tracks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8 max-w-4xl">
        {/* Track Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 truncate">{track.title}</h1>
              <p className="text-studio-text-secondary">{track.creatorName}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 self-start">
              <span className="flex items-center gap-1 text-xs text-studio-text-secondary">
                {track.visibility === "public" && <Globe className="w-3.5 h-3.5" />}
                {track.visibility === "unlisted" && <Link2 className="w-3.5 h-3.5" />}
                {track.visibility === "private" && <Lock className="w-3.5 h-3.5" />}
                {track.visibility === "public" ? "Public" : track.visibility === "unlisted" ? "Unlisted" : "Private"}
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <VersionSelector
                versions={versions}
                currentVersionId={selectedVersionId}
                onVersionChange={setSelectedVersionId}
              />
              <div className="flex items-center gap-2 self-start">
                {track.downloadsEnabled && selectedVersionId && (
                  <DownloadButton versionId={selectedVersionId} />
                )}
                {isOwner && (
                  <Button variant="secondary" size="sm" onClick={() => setShowAddVersion(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    New Version
                  </Button>
                )}
              </div>
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
            <ErrorBoundary
              FallbackComponent={PlayerErrorFallback}
              resetKeys={[selectedVersion.r2Key]}
            >
              <TrackPlayer
                r2Key={selectedVersion.r2Key}
                onTimestampClick={(ts) => setTimestampForComment(ts)}
                timestampComments={playerTimestampComments}
                seekToTime={seekToTime}
                onSeekComplete={() => setSeekToTime(null)}
              />
            </ErrorBoundary>
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

        {/* Anonymous viewer warning */}
        {!viewer && selectedVersionId && (
          <div className="bg-studio-dark border border-studio-gray rounded-lg px-4 py-3 mb-6 text-sm text-studio-text-secondary">
            <p>
              You are not signed in. Comments will be posted as <strong className="text-studio-text-primary">{anonymousIdentity.name}</strong>.{' '}
              <Link to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} className="text-studio-accent hover:underline">Sign in</Link>{' '}
              to use your own name.
            </p>
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
                currentAnonymousId={viewer ? undefined : anonymousIdentity.id}
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
                currentAnonymousId={viewer ? undefined : anonymousIdentity.id}
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
