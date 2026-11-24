# SoundSketch - Implementation Progress

## Git History

| Commit | Description |
|--------|-------------|
| `a6bdda9` | First commit (README) |
| `cc2844e` | Add `.claude/` folder (Convex rules, frontend-design prompt) |
| `6d228f1` | Add CLAUDE.md and PRD.md |
| `4ef6303` | Initial implementation — full backend, core frontend (47 files, ~9.5k lines) |
| `6982a81` | Remove Clerk references, migrate auth fields in schema |
| `f87b6b4` | Phase 2 — all remaining pages, components, types (22 files, ~1.5k lines) |
| `f51d589` | Simplify Convex functions, remove unused auth.config |
| `727a054` | Fix auth — restore auth.config.ts, clean convex.json |
| `21e9306` | Fix waveform — remove deprecated WaveSurfer.js v7 options |

---

## PRD Phase Coverage

### Phase 1: Core Functionality (MVP) — Complete

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Convex project setup | Done | `convex/schema.ts`, `convex.json` |
| Cloudflare R2 integration | Done | `convex/r2.ts`, `convex/lib/r2Client.ts` |
| Vite + React + TypeScript | Done | `vite.config.ts`, `tsconfig.json`, path alias `@` → `src/` |
| Audio upload to R2 | Done | `useFileUpload` hook, presigned PUT URLs |
| Track metadata in Convex | Done | `convex/tracks.ts` — create, getMyTracks, getPublicTracks |
| Shareable links | Done | `shareableId` field, `/track/:shareableId` route |
| WaveSurfer.js playback | Done | `useWaveform` hook, `TrackPlayer`, `PlaybackControls` |
| Version management | Done | `convex/versions.ts`, `VersionSelector`, `AddVersionModal` |

### Phase 2: Commenting — Complete

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| General track comments | Done | `CommentForm`, `CommentList`, `CommentItem` |
| Comment threading (replies) | Done | `parentCommentId` field, nested rendering in `CommentItem` |
| Timestamp comments | Done | `CommentForm` with optional timestamp, `TimestampMarker` |
| Timestamp markers on waveform | Done | `TimestampMarker` overlay, click-to-seek |
| Edit/delete comments | Done | Author (authenticated or anonymous) + track-owner moderation in `CommentItem` |

### Phase 3: Enhanced Features — Complete

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Convex Auth (email/password) | Done | `convex/auth.ts`, Password provider with custom profile (name on signup), `LoginForm` |
| User profiles | Done | `Profile` page, `convex/users.ts` viewer query |
| Private tracks + access control | Done | `trackAccess` table, `getByShareableId` access checks |
| Unlisted tracks | Done | Three-level visibility: public/unlisted/private. Unlisted tracks accessible via link but not listed on home page. |
| Visibility settings | Done | `TrackSettingsDropdown`, `updateVisibility` mutation (replaces `updatePrivacy`) |
| Track deletion | Done | `deleteTrack` mutation with confirmation modal |
| Comment attachments | Done | `useAttachmentUpload` hook, `CommentForm` file picker + audio recording (`AudioRecordingModal`, `useAudioRecording`), inline previews: image thumbnails with fullscreen lightbox (`ImageLightbox`), audio player; download for all types |
| Show comments across versions | Done | `includeAllVersions` param in queries, toggle in `TrackPage` |
| Responsive design | Done | Tailwind responsive classes throughout |
| Loading states + error handling | Done | Conditional rendering, error boundaries, toast notifications |
| Play from track lists + queue | Done | Play button on every `TrackCard` (Home, Profile); queues the rest of that list (latest versions, skips tracks with no version, stops at the end). `PlayerProvider` + `PlayerBar` keep playing across pages. Only one player sounds at a time (`src/lib/audioFocus.ts`) |
| Dark mode theming | Done | `studio.*` color palette, Space Mono + Inter fonts |

### Phase 4: Collaboration Features — Partially Complete

| Requirement | Status | Notes |
|-------------|--------|-------|
| @mentions in comments | Done | `MentionInput` component, `getTrackParticipants` query, highlight rendering |
| Collaborator invites | Done | `ManageCollaboratorsModal`, `grantAccess`/`revokeAccess` mutations, `searchByEmail` |
| Shared with Me (Profile) | Done | `getSharedWithMe` query, section in Profile page |
| Email notifications | Not started | Requires external email service (e.g., Resend) |
| Collaborator roles (viewer/commenter/editor) | Not started | PRD future phase |

### Security & UX Enhancements

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Optimistic updates (comments) | Done | `commentCreateOptimistic` helper in `src/lib/optimisticUpdates.ts`, wired via `withOptimisticUpdate` in `CommentForm` |
| Rate limiting (comments) | Done | `convex/lib/rateLimit.ts` helper, 10/min authenticated, 5/min per-track guest. `rateLimits` table in schema |
| Rate limiting (uploads) | Done | 5 uploads/hour per user via `checkRateLimit` in `convex/versions.ts` |
| Anonymous user identification | Done | Persistent identity via localStorage (`anonymousId`), funny generated names (adjective-animal), edit/delete authorization, optional comment claiming on signup/login via modal (`ClaimCommentsModal`) with selective claim/decline |
| Username-based authentication | Done | Username field in schema, login via username or email, optional email on signup, password confirmation |
| Account management | Done | Email editing, password change (with current password verification and session invalidation), account deletion with two modes: "keep_comments" (anonymize) or "delete_everything" (full removal). Cascading deletion of tracks, versions, comments, R2 files, and trackAccess records |

---

## Backend (Convex) — Complete

### Schema (`convex/schema.ts`)

- **users** — Convex Auth fields + avatarUrl, username. Indexes: email, by_username
- **tracks** — title, description, creatorId, creatorName, visibility ("public" | "unlisted" | "private"), shareableId, latestVersionId, downloadsEnabled (optional). Indexes: by_creator, by_shareable_id, by_visibility. Search indexes: search_title (title, filterFields: visibility), search_creator (creatorName, filterFields: visibility)
- **versions** — trackId, versionName, changeNotes, r2Key (streaming file), r2Bucket, fileName, fileSize, fileFormat, duration, uploadedBy, originalR2Key (optional - original lossless file), originalFileName (optional), originalFileSize (optional), originalFileFormat (optional). Index: by_track
- **comments** — versionId, trackId, authorId (optional), authorName, commentText, timestamp (optional), parentCommentId (threading), attachmentR2Key, attachmentFileName, anonymousId (optional), claimedByUser (optional: true = claimed, false = permanently declined). Indexes: by_version, by_track, by_parent, by_timestamp, by_anonymous_id, by_author
- **rateLimits** — key, timestamps (array). Index: by_key. Used for server-side rate limiting
- **trackAccess** — trackId, userId, grantedBy, grantedAt. Indexes: by_track, by_user, by_track_and_user
- **playlists** — title, description (optional), creatorId, creatorName, shareableId. Indexes: by_creator, by_shareable_id. Link-only: no visibility field (ADR 0003)

### Convex Functions

| File | Functions | Status |
|------|-----------|--------|
| `convex/tracks.ts` | create, searchPublicTracks, getByShareableId (returns `viewerRole`), updateSettings (title/description/visibility/downloads), getMyTracks, deleteTrack (cascades), grantAccess, revokeAccess, getCollaborators, getSharedWithMe | Done |
| `convex/playlists.ts` | create, getMyPlaylists, getByShareableId (anyone with the link; returns `viewerRole`) | Done |
| `convex/versions.ts` | create (rate-limited, validates R2 key prefix), getByTrack (access-checked, no storage keys), deleteVersion (cascades, re-points latestVersionId) | Done |
| `convex/comments.ts` | listThreads (timestamped + general threads with nested replies and per-comment `canEdit`/`canDelete`), create (guest-friendly, replies attach to thread root, rate-limited), updateComment, deleteComment (cascades to replies + attachment), getAnonymousCommentsForClaiming, claimAnonymousComments (claim listed, decline rest) | Done |
| `convex/storage.ts` | Internal queries that authorize file access and mint upload keys: versionStreamKey, versionDownloadKey, attachmentDownloadKey, newVersionKeys, newAttachmentKey | Done |
| `convex/r2.ts` | Actions (Node): getVersionStreamUrl, getVersionDownloadUrl, getAttachmentUrl, getVersionUploadUrls, getAttachmentUploadUrl; internal deleteObjects | Done |
| `convex/users.ts` | viewer, searchByEmail, getTrackParticipants (access-checked), updateName (propagates creatorName on tracks and playlists + comment authorName), checkUsernameAvailable, resolveLoginIdentifier, updateEmail, changePassword, deleteAccount (cascades; also removes auth sessions/accounts) | Done |
| `convex/auth.ts` | Convex Auth with Password provider, custom profile extracts name + username on signup | Done |
| `convex/http.ts` | Auth HTTP routes | Done |
| `convex/lib/access.ts` | Track access policy: readTrack/requireTrack, readVersion/requireVersion, requireUserId. Roles: owner, collaborator, guest. Playlist access: readPlaylist/requirePlaylist (anyone views, creator owns) | Done |
| `convex/lib/cascade.ts` | cascadeDelete (track → versions → comments → replies, grants; schedules R2 purge), deleteAuthRecords | Done |
| `convex/lib/storageKeys.ts` | randomId, versionKeys, attachmentKey, isVersionKeyFor, isAttachmentKeyFor | Done |
| `convex/lib/r2Client.ts` | S3-compatible R2 client, generateUploadUrl, generateDownloadUrl, deleteObjects | Done |
| `convex/lib/rateLimit.ts` | Reusable `checkRateLimit` helper — sliding window rate limiter backed by `rateLimits` table | Done |

### Tests

`npm test` (Vitest + convex-test, edge-runtime). `convex/access.test.ts` (visibility, guest identity, threads, storage keys), `convex/cascade.test.ts` (deletion, account deletion, claiming), `convex/playlists.test.ts` (playlist creation, link access, viewer role), `src/lib/fileTypes.test.ts`, `src/lib/queue.test.ts`. Shared helpers in `convex/test.setup.ts`.

---

## Frontend — Complete

### Infrastructure

| Item | Location | Notes |
|------|----------|-------|
| Vite + React + TypeScript | `vite.config.ts`, `tsconfig.json` | Path alias `@` → `src/` |
| Tailwind CSS with custom theme | `tailwind.config.js`, `src/styles/globals.css` | `studio.*` color palette, Space Mono + Inter fonts |
| Convex client setup | `src/lib/convex.ts` | ConvexReactClient singleton |
| ConvexAuthProvider | `src/main.tsx` | Wraps entire app |
| Toast notifications | `sonner` in `src/App.tsx` | Dark-themed toaster, bottom-right, used across all mutation/action feedback |
| Error boundaries | `react-error-boundary` in `src/App.tsx`, `src/pages/TrackPage.tsx` | Global + player-specific boundaries with themed fallbacks |
| OG meta tags | `index.html` | Static OG/Twitter Card tags, description, theme-color, placeholder image |
| Utility functions | `src/lib/utils.ts` | cn, formatDuration, formatFileSize, generateShareableLink, formatRelativeTime, getRecordingMimeType, mimeToExtension |
| File-type registry | `src/lib/fileTypes.ts` | validateUpload(file, 'track' \| 'attachment'), maxUploadBytes, acceptAttribute, attachmentKind, isLossless, extensionOf |
| Queue logic | `src/lib/queue.ts` | buildQueue(tracks, startTrackId), nextIndex, previousTarget (restart after 3s) |
| Audio focus | `src/lib/audioFocus.ts` | claimAudioFocus/releaseAudioFocus: starting one player pauses the other (queue player vs. `useWaveform`) |
| R2 upload | `src/lib/r2Upload.ts` | putToSignedUrl: XHR PUT with progress |
| Anonymous user utils | `src/lib/anonymousUser.ts` | generateAnonymousName, generateAnonymousId, getAnonymousIdentity (localStorage persistence) |
| Optimistic updates | `src/lib/optimisticUpdates.ts` | `commentCreateOptimistic`: patches local query cache for instant comment appearance |
| Type definitions | `src/types/index.ts` | Track, TrackForViewer, Version (client view), CommentThread, CommentView, id types |

### Hooks

| Hook | Location | Purpose |
|------|----------|---------|
| `useWaveform` | `src/hooks/useWaveform.ts` | WaveSurfer.js lifecycle: play/pause, seek, volume, speed, cleanup; claims audio focus on play |
| `usePlayer` | `src/hooks/usePlayer.ts` | App-wide queue player from `PlayerProvider`: queue, current, playFrom, toggle, next, previous, seek, setVolume, close |
| `useVersionStreamUrl`, `useAttachmentUrl` | `src/hooks/useSignedUrl.ts` | Signed GET URLs by versionId / commentId, one shared 55-min cache; `loadCachedUrl` for the queue player (with `fresh` retry on expiry) |
| `useFileUpload` | `src/hooks/useFileUpload.ts` | Full upload pipeline: validate -> convert lossless (WAV/FLAC) to MP3 via ffmpeg.wasm -> dual presigned URLs -> XHR to R2 -> save metadata. Exposes `stage` (idle/converting/uploading) for progress UI |
| `useAudioDuration` | `src/hooks/useAudioDuration.ts` | Extract duration from audio File via HTML5 Audio API |
| `useAttachmentUpload` | `src/hooks/useAttachmentUpload.ts` | Attachment upload for a track: validate -> presigned URL -> XHR to R2 with progress |
| `useKeyboardShortcuts` | `src/hooks/useKeyboardShortcuts.ts` | Spacebar play/pause, arrow key seeking (+/-5s), ignores editable inputs, modifier combos, defaultPrevented events, and interactive ARIA widgets |
| `useDebounce` | `src/hooks/useDebounce.ts` | Generic debounce hook for search input |
| `useAnonymousIdentity` | `src/hooks/useAnonymousIdentity.ts` | Persistent anonymous identity (funny names like "sneaky-owl") from localStorage |
| `useAudioRecording` | `src/hooks/useAudioRecording.ts` | Browser MediaRecorder API wrapper: mic access, record/stop, preview blob URL, file export |

### Pages

| Page | Route | Status |
|------|-------|--------|
| Home | `/` | Done: compact hero section + public tracks grid (title/creator search via URL `?q=` param) + empty-state CTA; play from card queues the grid |
| Login | `/login` | Done: email/password, sign in/sign up toggle, password visibility toggle, autocomplete attributes |
| Track Detail | `/track/:shareableId` | Done: pinned version session state, waveform player with double-click / button timestamp commenting, comments (with accessible cross-version switch), settings menu |
| Playlist | `/playlist/:shareableId` | Done: opens for anyone with the link; title, description, creator, share button (copies the playlist link), empty and not-found states. Renders owner copy from `viewerRole` |
| Upload | `/upload` | Done: card-framed drop zone + form, accessible visibility radio group, progress bar, redirect |
| Profile | `/profile` | Done: initial avatar card with inline name + email editing, responsive track header + full-width mobile filters, Playlists section (create, open), shared tracks section, account settings with password change, sign out, and two-mode account deletion |

### Components (29 total)

| Component | Location | Status |
|-----------|----------|--------|
| Navbar | `src/components/layout/Navbar.tsx` | Done: logo, search bar (with mobile overlay trigger), auth-conditional links, keyboard-accessible account menu (Profile + Sign Out) |
| SearchBar | `src/components/layout/SearchBar.tsx` | Done: debounced search input, URL param sync, desktop inline bar + mobile overlay mode |
| Button | `src/components/ui/Button.tsx` | Done: primary/secondary/danger, sm/md/lg, inline-flex icon/label alignment, focus-visible ring |
| Modal | `src/components/ui/Modal.tsx` | Done: backdrop blur, ESC close, responsive sizes |
| ErrorFallback | `src/components/ui/ErrorFallback.tsx` | Done: full-page error boundary fallback |
| PlayerErrorFallback | `src/components/ui/PlayerErrorFallback.tsx` | Done: inline audio player error fallback |
| LoginForm | `src/components/auth/LoginForm.tsx` | Done: Convex Auth integration, username-based signup/login, optional email, password visibility toggle |
| ClaimCommentsModal | `src/components/auth/ClaimCommentsModal.tsx` | Done: modal to selectively claim anonymous comments after login/signup |
| TrackPlayer | `src/components/audio/TrackPlayer.tsx` | Done: waveform + timestamp markers + single-click seek + double-click / button timestamp comment trigger + edge time readouts + keyboard shortcuts |
| PlaybackControls | `src/components/audio/PlaybackControls.tsx` | Done: transport controls, Comment at timestamp CTA, speed cycler, desktop volume + mute memory |
| PlayerProvider | `src/components/audio/PlayerProvider.tsx` | Done: owns shared `<audio>` for the queue; synchronous load cancellation via token on close/switch, retries once with fresh URL, toasts + skips on failure |
| PlayerBar | `src/components/audio/PlayerBar.tsx` | Done: fixed bottom bar with custom pointer/keyboard `role="slider"` seek bar, prev/play/next, title link, mobile time readout, volume, close button |
| TrackCard | `src/components/tracks/TrackCard.tsx` | Done: reusable card for Home + Profile; subtle lift hover, play/pause button (queues `list`), stretched link, accent border when current, creator + relative time + optional privacy badge |
| TrackDescription | `src/components/tracks/TrackDescription.tsx` | Done: preserves newlines, responsive line-clamped preview (2 lines mobile, 4 lines `sm+`) with Show more/less when overflowing |
| VersionSelector | `src/components/tracks/VersionSelector.tsx` | Done: custom accessible select chevron with version names + dates |
| ShareButton | `src/components/tracks/ShareButton.tsx` | Done: copies a track or playlist link (`kind` prop) to clipboard with toast confirmation |
| CreatePlaylistModal | `src/components/playlists/CreatePlaylistModal.tsx` | Done: title + optional description form; reports the new playlist via `onCreated` |
| TrackSettingsDropdown | `src/components/tracks/TrackSettingsDropdown.tsx` | Done: WAI-ARIA keyboard menu (visibility, collaborators, delete) with outside-click and Tab dismissal |
| AddVersionModal | `src/components/tracks/AddVersionModal.tsx` | Done: file upload + version metadata |
| ManageCollaboratorsModal | `src/components/tracks/ManageCollaboratorsModal.tsx` | Done: invite by email, list/remove collaborators |
| CommentForm | `src/components/comments/CommentForm.tsx` | Done: text input, optional timestamp badge (`at MM:SS`), file attachment, audio recording, @mention support |
| CommentItem | `src/components/comments/CommentItem.tsx` | Done: display, edit, two-step inline delete confirmation (Escape-cancelable), reply, timestamp click, inline attachment previews (image thumbnail + lightbox, audio player), download, mention highlighting, anonymous edit/delete |
| ImageLightbox | `src/components/comments/ImageLightbox.tsx` | Done: fullscreen image viewer with download button, ESC/backdrop close |
| CommentList | `src/components/comments/CommentList.tsx` | Done: renders threads from `listThreads` |
| TimestampMarker | `src/components/comments/TimestampMarker.tsx` | Done: waveform overlay markers clamped within edges, mobile-friendly touch hit target, focus-visible tooltip |
| MentionInput | `src/components/comments/MentionInput.tsx` | Done: textarea with @mention autocomplete dropdown |
| AudioRecordingModal | `src/components/comments/AudioRecordingModal.tsx` | Done: record voice feedback via browser mic, preview, attach to comment |
| TrackFilter | `src/components/tracks/TrackFilter.tsx` | Done: inline filter input for Profile page sections |
| FileDropZone | `src/components/upload/FileDropZone.tsx` | Done: keyboard-accessible drag-drop + format pills + `maxUploadBytes` limit display + validation |

### Routing (`src/App.tsx`)

All routes wired: `/`, `/login`, `/track/:shareableId`, `/playlist/:shareableId`, `/upload`, `/profile`, `*` (404). Wrapped in global `ErrorBoundary`. `PlayerProvider` wraps everything; `PlayerBar` renders after `<Routes>` so playback survives navigation. `Toaster` at root level, lifted above the bar while it shows.

---

## Key Patterns

- **Convex queries**: `useQuery(api.xxx, args)` — pass `"skip"` to defer until dependencies load
- **Convex mutations**: `useMutation(api.xxx)` returns async function. Comment creation uses `.withOptimisticUpdate()` for instant UI feedback
- **Convex actions**: `useAction(api.xxx)` for R2 presigned URLs (server-side, non-reactive)
- **Auth check**: `useQuery(api.users.viewer)` — null if not logged in, undefined while loading
- **Access control**: server-side only, via `convex/lib/access.ts`. Client reads `track.viewerRole` and per-comment `canEdit`/`canDelete`
- **Deletion**: always `cascadeDelete` from `convex/lib/cascade.ts`
- **R2 upload flow**: `r2.getVersionUploadUrls` / `r2.getAttachmentUploadUrl` (server mints key) → `putToSignedUrl` → save key via mutation (server checks key prefix)
- **R2 playback flow**: `useVersionStreamUrl(versionId)` (1hr URL, 55-min cache) → WaveSurfer
- **Attachment flow**: Select file → validate → upload to R2 → store r2Key in comment. Display: images show inline thumbnail (click for fullscreen lightbox), audio plays via `<audio>` element, others show download link
- **Queue playback**: `usePlayer().playFrom(list, trackId)` → `PlayerProvider` fetches each track's stream URL when it starts → shared `<audio>`. No waveform, no persistence across reloads
- **WaveSurfer**: Initialize in useEffect, destroy in cleanup. Never leak instances.
- **Styling**: Tailwind with `studio.*` custom colors, `.card`/`.input` base classes, dark mode default

---

## What's Not Yet Implemented

**From PRD — future phases:**
- Email notifications (requires external email service like Resend)
- Collaborator roles (viewer/commenter/editor — only basic access grant/revoke exists)

**Queue player — deliberately left out for now:**
- Waveforms on cards (needs peaks stored at upload)
- Shuffle, repeat, queue panel, global keyboard shortcuts, queue saved across reloads
- Track page driving the shared queue `<audio>` (currently the two players just pause each other)

**Tooling:**
- ~~Tests~~ — Done (Vitest + convex-test, `npm test`)
- ~~ESLint configuration~~ — Done (`.eslintrc.cjs`, `.eslintignore`)
