# SoundSketch - Implementation Progress

## Backend (Convex) — Complete

All backend functions are fully implemented and ready for frontend integration.

### Schema (`convex/schema.ts`)
- **users** — Convex Auth fields + avatarUrl, tokenIdentifier. Indexes: email, by_token_identifier
- **tracks** — title, description, creatorId, creatorName, isPublic, shareableId, latestVersionId. Indexes: by_creator, by_shareable_id, by_public
- **versions** — trackId, versionName, changeNotes, r2Key, r2Bucket, fileName, fileSize, fileFormat, duration, uploadedBy. Index: by_track
- **comments** — versionId, trackId, authorId (optional for guests), authorName, commentText, timestamp (optional), parentCommentId (threading), attachmentR2Key, attachmentFileName. Indexes: by_version, by_track, by_parent, by_timestamp
- **trackAccess** — trackId, userId, grantedBy, grantedAt. Indexes: by_track, by_user, by_track_and_user

### Convex Functions

| File | Functions | Status |
|------|-----------|--------|
| `convex/tracks.ts` | create, getPublicTracks, getByShareableId (w/ access control), getMyTracks, updatePrivacy, deleteTrack | Done |
| `convex/versions.ts` | create, getByTrack, getById, deleteVersion (w/ fallback) | Done |
| `convex/comments.ts` | create (guest-friendly), getByVersion, getTimestampComments, getGeneralComments, getReplies, deleteComment, updateComment | Done |
| `convex/r2.ts` | getTrackUploadUrl, getTrackDownloadUrl, getAttachmentUploadUrl | Done |
| `convex/users.ts` | viewer (current user query, returns `_id` from users table) | Done |
| `convex/auth.ts` | Convex Auth with Password provider | Done |
| `convex/http.ts` | Auth HTTP routes | Done |
| `convex/lib/r2Client.ts` | S3-compatible R2 client, generateUploadUrl, generateDownloadUrl | Done |

---

## Frontend — Complete

### Infrastructure (Complete)

| Item | Location | Notes |
|------|----------|-------|
| Vite + React + TypeScript | `vite.config.ts`, `tsconfig.json` | Path alias `@` → `src/` |
| Tailwind CSS with custom theme | `tailwind.config.js`, `src/styles/globals.css` | `studio.*` color palette, Space Mono + Inter fonts |
| Convex client setup | `src/lib/convex.ts` | ConvexReactClient singleton |
| ConvexAuthProvider | `src/main.tsx` | Wraps entire app |
| Utility functions | `src/lib/utils.ts` | cn, formatDuration, formatFileSize, validateAudioFile, generateShareableLink, formatRelativeTime |
| Type definitions | `src/types/index.ts` | Track, Version, Comment, User type exports |

### Hooks (Complete)

| Hook | Location | Purpose |
|------|----------|---------|
| `useWaveform` | `src/hooks/useWaveform.ts` | WaveSurfer.js lifecycle — play/pause, seek, volume, speed, cleanup |
| `usePresignedUrl` | `src/hooks/usePresignedUrl.ts` | Fetches + caches R2 download URLs (55-min cache) |
| `useFileUpload` | `src/hooks/useFileUpload.ts` | Full upload pipeline: validate → presigned URL → XHR to R2 → save metadata |
| `useAudioDuration` | `src/hooks/useAudioDuration.ts` | Extract duration from audio File via HTML5 Audio API |

### Pages (Complete)

| Page | Route | Status |
|------|-------|--------|
| Home | `/` | Done — hero section + public tracks grid (uses TrackCard) |
| Login | `/login` | Done — email/password, sign in/sign up toggle |
| Track Detail | `/track/:shareableId` | Done — player, versions, comments, settings |
| Upload | `/upload` | Done — file drop, form, progress bar, redirect |
| Profile | `/profile` | Done — user info, track grid with privacy badges |

### Components (Complete)

| Component | Location | Status |
|-----------|----------|--------|
| Navbar | `src/components/layout/Navbar.tsx` | Done — logo, auth-conditional buttons |
| Button | `src/components/ui/Button.tsx` | Done — primary/secondary/danger, sm/md/lg |
| Modal | `src/components/ui/Modal.tsx` | Done — backdrop blur, ESC close, responsive sizes |
| LoginForm | `src/components/auth/LoginForm.tsx` | Done — Convex Auth integration |
| TrackPlayer | `src/components/audio/TrackPlayer.tsx` | Done — waveform + timestamp markers + external seek |
| PlaybackControls | `src/components/audio/PlaybackControls.tsx` | Done — play/pause, progress, volume, speed |
| TrackCard | `src/components/tracks/TrackCard.tsx` | Done — reusable card for Home + Profile |
| VersionSelector | `src/components/tracks/VersionSelector.tsx` | Done — dropdown with version names + dates |
| ShareButton | `src/components/tracks/ShareButton.tsx` | Done — copies link to clipboard |
| TrackSettingsDropdown | `src/components/tracks/TrackSettingsDropdown.tsx` | Done — privacy toggle, delete with confirmation |
| AddVersionModal | `src/components/tracks/AddVersionModal.tsx` | Done — file upload + version metadata |
| CommentForm | `src/components/comments/CommentForm.tsx` | Done — text input with optional timestamp |
| CommentItem | `src/components/comments/CommentItem.tsx` | Done — display, edit, delete, reply, timestamp click |
| CommentList | `src/components/comments/CommentList.tsx` | Done — renders top-level comments |
| TimestampMarker | `src/components/comments/TimestampMarker.tsx` | Done — waveform overlay markers |
| FileDropZone | `src/components/upload/FileDropZone.tsx` | Done — drag-drop + validation |

### Routing (`src/App.tsx`)
All routes wired: `/`, `/login`, `/track/:shareableId`, `/upload`, `/profile`, `*` (404).

---

## Key Patterns

- **Convex queries**: Use `useQuery(api.xxx, args)` — pass `"skip"` to defer until dependencies load
- **Convex mutations**: `useMutation(api.xxx)` returns async function
- **Convex actions**: `useAction(api.xxx)` for R2 presigned URLs (server-side, non-reactive)
- **Auth check**: `useQuery(api.users.viewer)` — null if not logged in, undefined while loading
- **Ownership check**: Compare `viewer._id` with `track.creatorId` (both are `Id<"users">`)
- **R2 upload flow**: Get presigned PUT URL → XHR upload → save metadata via mutation
- **R2 playback flow**: Get presigned GET URL (1hr cache) → pass to WaveSurfer
- **WaveSurfer**: Initialize in useEffect, destroy in cleanup. Never leak instances.
- **Styling**: Tailwind with `studio.*` custom colors, `.card`/`.input` base classes, dark mode default

## What's Not Yet Implemented (Future Phases per PRD)

- Comment attachments UI (backend supports it, frontend forms don't yet include file attachment)
- @mentions in comments
- Email notifications
- Collaborator roles / invite-only tracks
- ESLint configuration (no `.eslintrc` at project root)
