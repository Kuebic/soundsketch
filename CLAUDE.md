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
├── src/
│   ├── components/
│   │   ├── audio/       # TrackPlayer, PlaybackControls
│   │   ├── auth/        # LoginForm
│   │   ├── comments/    # (placeholder - not implemented)
│   │   ├── layout/      # Navbar
│   │   ├── tracks/      # (placeholder - not implemented)
│   │   ├── ui/          # Custom Button, Modal components
│   │   └── upload/      # (placeholder - not implemented)
│   ├── pages/       # Home, Login
│   ├── hooks/       # useWaveform, usePresignedUrl, useFileUpload, useAudioDuration
│   ├── lib/         # Convex client, utilities (cn, formatters, validators)
│   └── types/       # TypeScript type definitions
```

## Key Concepts

### Data Model
- **Tracks** have multiple **Versions** (e.g., "v1", "Final Mix")
- **Versions** have **Comments** (timestamp or general)
- **Users** own tracks and can make them public/private
- Audio files live in R2, metadata in Convex

### R2 Integration Pattern
- Frontend requests presigned URL from Convex action
- Upload/download happens directly between browser and R2
- Convex stores only the R2 key and metadata
- URLs expire (5min for PUT, 1hr for GET)

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
- Convex schema: `convex/schema.ts`
- R2 integration: `convex/r2.ts`
- Auth configuration: `convex/auth.ts` (Password provider)

## Quick Reference

### Commands
- `npm run dev` - Start Vite dev server (run `npx convex dev` separately for backend)
- `npm run lint` - Run ESLint
- `npm run lint -- --fix` - Fix auto-fixable lint issues  
- `npm run typecheck` - Run TypeScript type checking
- `npx convex dev` - Start Convex dev server (auto-generates types)

**Do not run:** `npm run dev` (assume already running), `npm run build` (CI only)

### Custom UI Components
Custom components in `src/components/ui/`:
- `Button` - Variants: primary, secondary, danger; Sizes: sm, md, lg
- `Modal` - Basic modal wrapper
- Uses Tailwind with custom studio theme (purple accent, dark mode)
- Utility: `cn()` from `src/lib/utils.ts` for combining class names
