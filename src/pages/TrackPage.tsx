import { useEffect, useState } from 'react';
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
import { AddToPlaylistModal } from '@/components/playlists/AddToPlaylistModal';
import { DownloadButton } from '@/components/tracks/DownloadButton';
import { TrackDescription } from '@/components/tracks/TrackDescription';
import { CommentForm } from '@/components/comments/CommentForm';
import { CommentList } from '@/components/comments/CommentList';
import { Button } from '@/components/ui/Button';
import { PlayerErrorFallback } from '@/components/ui/PlayerErrorFallback';
import { useAnonymousIdentity } from '@/hooks/useAnonymousIdentity';
import { cn, formatDuration } from '@/lib/utils';
import { Loader2, Globe, Lock, Link2, ListPlus, Plus, X, Clock, MessageCircle, Layers } from 'lucide-react';
import type { VersionId } from '@/types';

const VISIBILITY_LABEL = {
  public: 'Public',
  unlisted: 'Unlisted',
  private: 'Private',
} as const;

export function TrackPage() {
  const { shareableId } = useParams<{ shareableId: string }>();
  const location = useLocation();
  // Pin the active version per track so incoming collaborator uploads do not
  // silently swap the recording or redirect an in-progress comment draft.
  const [pickedVersion, setPickedVersion] = useState<{ shareableId: string; versionId: VersionId } | null>(null);
  const [timestampDraft, setTimestampDraft] = useState<{ timestamp: number; versionId: VersionId } | null>(null);
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

  // Pin the first version once loaded for this shareableId so subsequent
  // reactive inserts at versions[0] do not hijack the listening session.
  useEffect(() => {
    if (!shareableId || !versions || versions.length === 0) return;
    setPickedVersion((prev) => {
      if (prev && prev.shareableId === shareableId && versions.some((v) => v._id === prev.versionId)) {
        return prev;
      }
      return { shareableId, versionId: versions[0]._id };
    });
  }, [shareableId, versions]);

  const pickedVersionId =
    pickedVersion && pickedVersion.shareableId === shareableId ? pickedVersion.versionId : null;
  const selectedVersion =
    versions?.find((v) => v._id === pickedVersionId) ?? versions?.[0];
  const selectedVersionId = selectedVersion?._id ?? null;
  const selectVersion = (versionId: VersionId) => {
    if (shareableId) setPickedVersion({ shareableId, versionId });
    setTimestampDraft(null);
  };

  // Keep an active timestamp draft bound only to the currently selected version.
  const activeTimestampDraft =
    timestampDraft && timestampDraft.versionId === selectedVersionId ? timestampDraft : null;

  const threads = useQuery(
    api.comments.listThreads,
    selectedVersionId
      ? { versionId: selectedVersionId, includeAllVersions: showAllVersions, anonymousId: anonymousIdentity.id }
      : 'skip'
  );

  const isOwner = track?.viewerRole === 'owner';
  // Keyed by track so the picker cannot follow a route change to another track.
  const [playlistPickerFor, setPlaylistPickerFor] = useState<string | null>(null);

  // Build timestamp markers for the player
  const playerTimestampComments = threads?.timestamped.map((c) => ({
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

      <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-8 max-w-4xl">
        {/* Track Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight line-clamp-2 break-words">
                {track.title}
              </h1>
              <div className="mt-1 flex items-center gap-2 min-w-0 text-sm text-studio-text-secondary">
                <span className="truncate">{track.creatorName}</span>
                <span
                  className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-studio-gray bg-studio-dark px-2 py-0.5 text-xs"
                  title={`Visibility: ${VISIBILITY_LABEL[track.visibility]}`}
                >
                  {track.visibility === 'public' && <Globe className="w-3 h-3" />}
                  {track.visibility === 'unlisted' && <Link2 className="w-3 h-3" />}
                  {track.visibility === 'private' && <Lock className="w-3 h-3" />}
                  {VISIBILITY_LABEL[track.visibility]}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ShareButton shareableId={track.shareableId} />
              {/* Owners get this inside the settings menu. */}
              {viewer && !isOwner && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPlaylistPickerFor(track._id)}
                  aria-label="Add to playlist"
                  title="Add to playlist"
                >
                  <ListPlus className="w-4 h-4" />
                </Button>
              )}
              {isOwner && <TrackSettingsDropdown track={track} />}
              <AddToPlaylistModal
                isOpen={playlistPickerFor === track._id}
                onClose={() => setPlaylistPickerFor(null)}
                track={track}
              />
            </div>
          </div>
          {track.description && (
            <TrackDescription description={track.description} className="mt-2" />
          )}
        </div>

        {/* Version toolbar */}
        {versions && versions.length > 0 && selectedVersion && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <VersionSelector
                versions={versions}
                currentVersionId={selectedVersion._id}
                onVersionChange={selectVersion}
              />
              <div className="flex items-center gap-2 flex-shrink-0">
                {(track.downloadsEnabled || isOwner) && (
                  <DownloadButton versionId={selectedVersion._id} />
                )}
                {isOwner && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowAddVersion(true)}
                    aria-label="New version"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">New Version</span>
                  </Button>
                )}
              </div>
            </div>
            {selectedVersion.changeNotes && (
              <p className="text-xs text-studio-text-secondary italic line-clamp-2 break-words">
                {selectedVersion.changeNotes}
              </p>
            )}
            {versions.length > 1 && (
              <label className="inline-flex items-center gap-2 text-sm text-studio-text-secondary cursor-pointer select-none">
                <button
                  type="button"
                  role="switch"
                  aria-checked={showAllVersions}
                  onClick={() => setShowAllVersions((v) => !v)}
                  className={cn(
                    'relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent focus-visible:ring-offset-2 focus-visible:ring-offset-studio-black',
                    showAllVersions
                      ? 'bg-studio-accent border-studio-accent'
                      : 'bg-studio-dark border-studio-gray'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-3.5 w-3.5 rounded-full transition-transform',
                      showAllVersions
                        ? 'translate-x-[18px] bg-white'
                        : 'translate-x-0.5 bg-studio-text-secondary'
                    )}
                  />
                </button>
                <Layers className="w-4 h-4" />
                Show comments from all versions
              </label>
            )}
          </div>
        )}

        {/* Player */}
        {selectedVersion ? (
          <div className="mb-6 sm:mb-8">
            <ErrorBoundary
              FallbackComponent={PlayerErrorFallback}
              resetKeys={[selectedVersion._id]}
            >
              <TrackPlayer
                versionId={selectedVersion._id}
                onRequestComment={(ts) => setTimestampDraft({ timestamp: ts, versionId: selectedVersion._id })}
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
                <Plus className="w-4 h-4" />
                Upload First Version
              </Button>
            )}
          </div>
        )}

        {/* Timestamp Comment Form */}
        {activeTimestampDraft && (
          <div className="card mb-6 border border-studio-accent/30">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-sm text-studio-accent-cyan mono">
                <Clock className="w-4 h-4" />
                Comment at {formatDuration(activeTimestampDraft.timestamp)}
              </span>
              <button
                type="button"
                onClick={() => setTimestampDraft(null)}
                className="p-1 rounded text-studio-text-secondary hover:text-studio-text-primary hover:bg-studio-dark"
                aria-label="Close timestamp comment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <CommentForm
              versionId={activeTimestampDraft.versionId}
              trackId={track._id}
              timestamp={activeTimestampDraft.timestamp}
              onSubmit={() => setTimestampDraft(null)}
              onCancel={() => setTimestampDraft(null)}
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
                threads={threads?.timestamped}
                anonymousId={anonymousIdentity.id}
                onTimestampClick={(ts) => setSeekToTime(ts)}
                versionId={selectedVersionId}
                trackId={track._id}
                emptyMessage="Double-click the waveform or press Comment in the player to add timestamp feedback."
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
                threads={threads?.general}
                anonymousId={anonymousIdentity.id}
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
