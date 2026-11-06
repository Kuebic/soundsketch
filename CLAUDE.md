# Music Collaboration Platform

## What This Is
A web app for musicians to share demo tracks with collaborators. Think SoundCloud meets version control - upload audio files, manage multiple versions, get timestamp-specific feedback on waveforms.

**Core Purpose:** Replace ad-hoc file sharing with a purpose-built tool for iterative music collaboration.

## Tech Stack
- **Frontend:** React + TypeScript + Vite, Tailwind CSS, Wavesurfer.js for audio
- **Backend:** Convex (database + serverless functions + auth)
- **Storage:** Cloudflare R2 (audio files via presigned URLs)

## Project Structure
```
├── convex/          # Convex backend (schema, queries, mutations, R2 actions)
│   ├── lib/access.ts      # Track access policy — every function asks it
│   ├── lib/cascade.ts     # The only code that deletes tracks/versions/comments
│   ├── lib/storageKeys.ts # R2 key minting + prefix checks
│   ├── storage.ts         # Internal queries: authorize file access by id
│   └── r2.ts              # Node actions: signed URLs by versionId/commentId
├── src/
│   ├── components/
│   │   ├── audio/       # TrackPlayer, PlaybackControls
│   │   ├── auth/        # LoginForm
│   │   ├── comments/    # CommentForm, CommentItem, CommentList, TimestampMarker
│   │   ├── layout/      # Navbar
│   │   ├── tracks/      # TrackCard, VersionSelector, ShareButton, TrackSettingsDropdown, AddVersionModal
│   │   ├── ui/          # Custom Button, Modal components
│   │   └── upload/      # FileDropZone
│   ├── pages/       # Home, Login, TrackPage, Upload, Profile
│   ├── hooks/       # useWaveform, useSignedUrl, useFileUpload, useAttachmentUpload, ...
│   ├── lib/         # Convex client, fileTypes registry, r2Upload, utils
│   └── types/       # Client view types derived from Convex function return types
```

## Key Concepts

### Data Model
- **Tracks** have multiple **Versions** (e.g., "v1", "Final Mix")
- **Versions** have **Comments** (timestamp or general)
- **Users** own tracks and can make them public/private
- Audio files live in R2, metadata in Convex

Domain terms are defined in `GLOSSARY.md`. Decisions not to revisit are in `docs/adr/`.

### Access control (`convex/lib/access.ts`)
- Every query/mutation/action that touches a track, version, comment or file goes through `readTrack`/`requireTrack` or `readVersion`/`requireVersion`. Never compare `creatorId` or query `trackAccess` by hand.
- Roles: `owner`, `collaborator`, `guest` (public/unlisted viewer). Queries return null/empty for no access; mutations throw.
- The client never decides permissions: use `track.viewerRole` and each comment's `canEdit`/`canDelete` from `comments.listThreads`.

### Deletion (`convex/lib/cascade.ts`)
- Delete tracks, versions and comments only via `cascadeDelete(ctx, targets)`. It removes child rows and schedules R2 cleanup. A new child table or file field → update `cascade.ts` and its test.

### R2 Integration Pattern (ADR 0001)
- Clients never send or receive stored R2 keys. They ask for URLs by `versionId`/`commentId` (`r2.getVersionStreamUrl`, `r2.getAttachmentUrl`, ...); `convex/storage.ts` checks access and resolves the key.
- Upload: server mints the key (`r2.getVersionUploadUrls`, `r2.getAttachmentUploadUrl`), browser PUTs to R2, mutation saves the key after checking it sits under the track's prefix.
- URLs expire (5min for PUT, 1hr for GET); `useSignedUrl` caches GETs for 55min.
- Accepted formats and size limits live only in `src/lib/fileTypes.ts`.

### Wavesurfer.js
- Used for waveform visualization and playback
- Timestamp comments placed as markers on waveform
- Initialize in `useEffect`, destroy on cleanup

## Code Conventions
- TypeScript strict mode
- Components: PascalCase (`TrackPlayer.tsx`)
- Hooks/utils: camelCase (`useWaveform.ts`)
- Use Convex hooks: `useQuery`, `useMutation`, `useAction`
- Tailwind for styling, dark mode primary
- Custom UI components (not shadcn/ui): `Button`, `Modal` in `src/components/ui/`
- Convex Auth with Password provider (`@convex-dev/auth`)

## Environment Setup
```bash
# Frontend
VITE_CONVEX_URL=https://your-deployment.convex.cloud

# Convex (set in dashboard)
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
```

## Important Details
- **File formats:** MP3, WAV, FLAC, M4A, AAC, OGG (up to 200MB)
- **Comments:** Version-specific, can be timestamp or general
- **Auth:** Convex Auth with Password provider - public tracks work without login
- **Real-time:** Convex queries auto-update (reactive)
- **Styling:** Custom Tailwind theme with Space Mono (display/mono) and Inter (body) fonts

## Common Patterns
- Always destroy Wavesurfer instance in cleanup
- Validate file size/type before upload
- Cache presigned URLs to reduce API calls
- Handle URL expiry and regenerate as needed
- Use Convex indexes for efficient queries

## Where to Find Details
- Full feature spec and database schema: `PRD.md`
- Implementation progress and phase coverage: `PROGRESS.md`
- Git history (`git log --oneline`): Check for recent changes and context before starting work
- Convex schema: `convex/schema.ts`
- R2 integration: `convex/r2.ts`
- Auth configuration: `convex/auth.ts` (Password provider)

## After Making Changes
- **Run `npm test`** (Vitest + convex-test). Backend tests go in `convex/*.test.ts` and call functions through `api`/`internal`, using `setup()`/`signIn()` from `convex/test.setup.ts`.
- **Run `npm run typecheck`** to check for TypeScript errors.
- **Run `npm run lint`** to check for ESLint issues. Use `npm run lint -- --fix` to auto-fix.
- **Update `PROGRESS.md`** after adding, removing, or modifying features, components, pages, hooks, or backend functions. Keep the PRD phase coverage, file inventories, and "not yet implemented" sections accurate.

## Quick Reference

### Commands
- `npm run dev` - Start Vite dev server (run `npx convex dev` separately for backend)
- `npm run lint` - Run ESLint
- `npm run lint -- --fix` - Fix auto-fixable lint issues  
- `npm run typecheck` - Run TypeScript type checking
- `npm test` - Run tests once (`npm run test:watch` to watch)
- `npx convex dev` - Start Convex dev server (auto-generates types; `npx convex codegen` regenerates `convex/_generated` after adding a module)

**Do not run:** `npm run dev` (assume already running), `npm run build` (CI only)

### Custom UI Components
Custom components in `src/components/ui/`:
- `Button` - Variants: primary, secondary, danger; Sizes: sm, md, lg
- `Modal` - Basic modal wrapper
- Uses Tailwind with custom studio theme (purple accent, dark mode)
- Utility: `cn()` from `src/lib/utils.ts` for combining class names
