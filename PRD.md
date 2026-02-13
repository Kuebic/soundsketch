# Product Requirements Document: Music Collaboration Platform

## 1. Product Overview

### Purpose
A purpose-built web application for musicians to share work-in-progress demos with remote collaborators. The platform enables easy sharing via links, version management, and collaborative feedback with timestamp-specific comments.

### Target Users
- Musicians creating demos
- Remote collaborators/co-writers
- Producers and engineers providing feedback

### Core Value Proposition
Replace ad-hoc file sharing (Google Drive, Dropbox) with a tailored solution that supports:
- Version history with named releases
- Timestamp-based commenting on waveforms
- Easy link sharing for public or private tracks
- Reference file attachments for feedback

---

## 2. Tech Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Audio Visualization**: Wavesurfer.js (for waveform display and interaction)
- **Icons**: Lucide React
- **HTTP Client**: Convex React client
- **Routing**: React Router v6

### Backend
- **Database & Functions**: Convex
  - Real-time database for tracks, comments, versions
  - Serverless functions for business logic
  - Built-in auth for user management
- **File Storage**: Cloudflare R2
  - Store audio files (MP3, WAV, FLAC, M4A)
  - Generate presigned URLs for secure access
  - Integration via Convex actions

### Authentication
- **Convex Auth** for user accounts (optional)
- Public access via shareable links (no login required)
- Private tracks require authentication

---

## 3. Core Features

### 3.1 Track Management

#### Upload & Create Track
- **Supported Formats**: MP3, WAV, FLAC, M4A, AAC
- **Max File Size**: 200MB per file
- **Required Metadata**:
  - Track title
  - Artist/creator name (auto-filled from user profile if logged in)
  - Description (optional)
  - Privacy setting: Public or Private
  - Version name (default: "v1")
- **Storage Flow**:
  1. Upload file to Cloudflare R2
  2. Store metadata in Convex (track ID, R2 key, file size, duration, format)
  3. Generate shareable link

#### Track Privacy
- **Public**: Anyone with link can listen (no login required)
- **Private**: Only authenticated users with permission can access
- Track creator can toggle privacy settings

#### Shareable Links
- Each track gets a unique shareable URL: `/track/{trackId}`
- Links work without login for public tracks
- Private track links redirect to login if unauthenticated

### 3.2 Version Management

#### Version Uploading
- Users can upload new versions of existing tracks
- Each version requires:
  - Version name (e.g., "v2", "Final Mix", "Rough Demo", "Mastered")
  - Optional: Notes about what changed
- **Default Behavior**: Latest version is displayed prominently
- All previous versions remain accessible in version history

#### Version Display
- **Track Page Header**: Shows latest version name and upload date
- **Version Dropdown**: Lists all versions chronologically (newest first)
- **Version Switching**: Click version to switch playback and comments context
- **Version Metadata**: Each version stores:
  - Version name
  - Upload timestamp
  - File URL (R2)
  - Duration
  - File format and size
  - Change notes

#### Version History UI
```
Current Version: "Final Mix" (uploaded 2 days ago)
▼ Version History
  □ Final Mix - Feb 11, 2025 (current)
  □ v3 - Feb 9, 2025
  □ v2 - Feb 8, 2025
  □ v1 - Feb 7, 2025
```

### 3.3 Audio Playback

#### Waveform Player
- **Library**: Wavesurfer.js
- **Display**: Full-width waveform visualization
- **Controls**:
  - Play/Pause
  - Seek (click anywhere on waveform)
  - Volume control
  - Playback speed (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
  - Download button (for track owner)
- **Features**:
  - Progress indicator
  - Time display (current / total)
  - Responsive design for mobile

#### Waveform Interactions
- Click to seek
- Click + hold to add timestamp comment (shows comment icon at cursor position)
- Hover over existing timestamp comments to preview

### 3.4 Commenting System

#### Two Comment Types

**1. Timestamp Comments**
- Attached to specific moment in track (e.g., at 1:23)
- Created by clicking waveform at desired timestamp
- Displayed as markers on waveform
- **Comment Form**:
  - Timestamp (auto-filled, displayed as MM:SS)
  - Comment text (required)
  - Optional: Attach reference file (MP3, WAV, screenshot, PDF, etc.)
  - Optional: Tag collaborators (@mention)
- **Display**:
  - Markers on waveform at timestamp location
  - Click marker to open comment thread
  - Sidebar showing all timestamp comments in chronological order

**2. General Track Comments**
- Not tied to specific timestamp
- General feedback/discussion
- Appear in separate "Discussion" section below player
- Same features: text, attachments, @mentions

#### Comment Features
- **Attachments**: Users can attach reference files to comments
  - Supported: Audio files, images (PNG, JPG), PDFs, text files
  - Max 50MB per attachment
  - Stored in R2, linked in Convex
- **Threading**: Replies to comments
- **@Mentions**: Tag other collaborators (if authenticated)
- **Timestamps**: All comments show author and time posted
- **Edit/Delete**: Authors can edit/delete their own comments

#### Comment Scope
- Comments are **version-specific**
- When switching versions, comments for that version are displayed
- Option to "Show all comments across versions" (checkbox toggle)

### 3.5 User Authentication (Optional)

#### Account Types
- **Guest/Anonymous**: Can view public tracks, cannot comment
- **Authenticated User**: Can upload tracks, comment, create private tracks

#### Auth Features
- Sign up / Sign in (email + password via Convex Auth)
- User profile:
  - Display name
  - Email
  - Avatar (optional)
- Track creator dashboard: View all uploaded tracks

#### Permissions
- Track creators can:
  - Upload new versions
  - Delete tracks/versions
  - Change privacy settings
  - Moderate comments (delete any comment on their tracks)
- Authenticated users can:
  - Comment on any track (public or private with access)
  - Upload their own tracks
- Guests can:
  - View and play public tracks only
  - Cannot comment

---

## 4. Database Schema (Convex)

### Tables

#### `users`
```typescript
{
  _id: Id<"users">,
  _creationTime: number,
  email: string,
  name: string,
  avatarUrl?: string,
  tokenIdentifier: string, // Links to @convex-dev/auth identity
}
```

#### `tracks`
```typescript
{
  _id: Id<"tracks">,
  _creationTime: number,
  title: string,
  description?: string,
  creatorId: Id<"users">,
  creatorName: string, // denormalized for display
  isPublic: boolean,
  shareableId: string, // unique short ID for URLs
  latestVersionId: Id<"versions">,
}
```

#### `versions`
```typescript
{
  _id: Id<"versions">,
  _creationTime: number,
  trackId: Id<"tracks">,
  versionName: string, // "v1", "Final Mix", etc.
  changeNotes?: string,
  r2Key: string, // Cloudflare R2 object key
  r2Bucket: string,
  fileName: string,
  fileSize: number, // bytes
  fileFormat: string, // "mp3", "wav", etc.
  duration: number, // seconds
  uploadedBy: Id<"users">,
}
```

#### `comments`
```typescript
{
  _id: Id<"comments">,
  _creationTime: number,
  versionId: Id<"versions">,
  trackId: Id<"tracks">,
  authorId?: Id<"users">, // optional if allowing guest comments
  authorName: string,
  commentText: string,
  timestamp?: number, // seconds into track (null for general comments)
  parentCommentId?: Id<"comments">, // for threading/replies
  attachmentR2Key?: string, // if comment has attachment
  attachmentFileName?: string,
}
```

#### `trackAccess` (for private tracks)
```typescript
{
  _id: Id<"trackAccess">,
  trackId: Id<"tracks">,
  userId: Id<"users">,
  grantedBy: Id<"users">,
  grantedAt: number,
}
```

### Indexes
- `users.by_email`: `email`
- `users.by_token_identifier`: `tokenIdentifier`
- `tracks.by_creator`: `creatorId`
- `tracks.by_shareable_id`: `shareableId`
- `tracks.by_public`: `isPublic`
- `versions.by_track`: `trackId`
- `comments.by_version`: `versionId`
- `comments.by_track`: `trackId`
- `comments.by_parent`: `parentCommentId`
- `comments.by_timestamp`: `versionId`, `timestamp`
- `trackAccess.by_track`: `trackId`
- `trackAccess.by_user`: `userId`
- `trackAccess.by_track_and_user`: `trackId`, `userId`

---

## 5. Cloudflare R2 Storage Architecture

### Bucket Structure
```
bucket-name/
  ├── tracks/
  │   ├── {trackId}/
  │   │   ├── {versionId}.mp3
  │   │   ├── {versionId}.wav
  │   │   └── ...
  └── attachments/
      ├── {commentId}/
      │   └── {filename}
```

### Upload Flow
1. Frontend requests upload URL from Convex action
2. Convex action generates presigned PUT URL from R2
3. Frontend uploads file directly to R2 using presigned URL
4. Frontend calls Convex mutation to save metadata
5. Convex stores R2 key and file metadata in database

### Download/Playback Flow
1. Frontend requests file URL from Convex query/action
2. Convex generates presigned GET URL (valid for 1 hour)
3. Frontend uses URL in audio player or download link
4. URL expires after 1 hour (regenerate on demand)

### R2 Configuration
- **Bucket Name**: `music-collab-files`
- **Region**: Auto (Cloudflare handles this)
- **Presigned URL Expiry**: 3600 seconds (1 hour) for GET, 300 seconds (5 min) for PUT
- **CORS**: Enable for frontend domain

---

## 6. API Specifications (Convex Functions)

### Queries (Real-time, Reactive)

#### `tracks.getPublicTracks`
- Returns list of all public tracks
- Sorted by creation time (newest first)
- Includes latest version info

#### `tracks.getTrackById`
- Input: `trackId` or `shareableId`
- Returns: Track details + all versions + creator info
- Validates access permissions for private tracks

#### `tracks.getMyTracks`
- Requires auth
- Returns all tracks created by current user

#### `versions.getVersionsByTrack`
- Input: `trackId`
- Returns: All versions for a track, sorted newest first

#### `comments.getCommentsByVersion`
- Input: `versionId`
- Returns: All comments for specific version
- Organized by timestamp comments vs general comments

### Mutations (Write Operations)

#### `tracks.create`
- Input: `{ title, description?, isPublic }`
- Returns: `trackId` and `shareableId`
- Auth required

#### `tracks.updatePrivacy`
- Input: `{ trackId, isPublic }`
- Auth required, validates ownership

#### `versions.create`
- Input: `{ trackId, versionName, changeNotes?, r2Key, fileName, fileSize, fileFormat, duration }`
- Updates `tracks.latestVersionId`
- Returns: `versionId`

#### `comments.create`
- Input: `{ versionId, trackId, commentText, timestamp?, parentCommentId?, attachmentR2Key?, attachmentFileName? }`
- Auth optional (can allow guest comments for public tracks)
- Returns: `commentId`

#### `comments.delete`
- Input: `{ commentId }`
- Validates: User is comment author OR track owner

### Actions (Server-side, Non-reactive)

#### `r2.generateUploadUrl`
- Input: `{ fileName, fileType, trackId, versionName }`
- Generates presigned PUT URL for R2
- Returns: `{ uploadUrl, r2Key }`

#### `r2.generateDownloadUrl`
- Input: `{ r2Key }`
- Generates presigned GET URL for R2
- Returns: `{ downloadUrl }` (valid 1 hour)

#### `r2.generateAttachmentUploadUrl`
- Input: `{ fileName, fileType, commentId }`
- For comment attachments

---

## 7. UI/UX Requirements

### Pages

#### 1. Home/Dashboard (`/`)
- If logged in: User's tracks + public tracks feed
- If logged out: Public tracks feed only
- **Layout**:
  - Header with logo, search, login/signup
  - "Upload Track" button (prominent)
  - Grid of track cards (cover art/waveform thumbnail, title, creator, duration)

#### 2. Track Page (`/track/{shareableId}`)
- **Header Section**:
  - Track title (editable by owner)
  - Creator name
  - Privacy badge (Public/Private)
  - Share button (copy link)
  - Settings dropdown (owner only): Change privacy, delete track
- **Player Section**:
  - Waveform visualization (Wavesurfer.js)
  - Playback controls
  - Current version dropdown
- **Timestamp Comments Section**:
  - List of timestamp comments ordered by timestamp
  - Click to jump to timestamp
  - Reply/add attachment buttons
- **General Discussion Section**:
  - General comments (not timestamp-specific)
  - Reply threads
- **Version History Sidebar**:
  - List all versions
  - Upload new version button (owner only)

#### 3. Upload Page (`/upload`)
- Auth required
- **Form**:
  - File upload (drag-drop or click)
  - Track title
  - Description (optional)
  - Privacy toggle
  - Version name (if adding to existing track)
- **Progress**:
  - Upload progress bar
  - Processing indicator
- Redirect to track page after upload

#### 4. User Profile (`/profile`)
- Display name and email
- List of user's tracks
- Account settings

### Responsive Design
- Mobile-first approach
- Waveform player adapts to screen size
- Sidebar converts to bottom sheet on mobile
- Touch-friendly controls

### Color Scheme
- Dark mode primary (music production aesthetic)
- Accent colors for interactive elements
- High contrast for accessibility

---

## 8. File Structure (Recommended)

```
music-collab-platform/
├── convex/
│   ├── schema.ts              # Convex schema definition
│   ├── tracks.ts              # Track queries/mutations
│   ├── versions.ts            # Version queries/mutations
│   ├── comments.ts            # Comment queries/mutations
│   ├── r2.ts                  # R2 actions (upload/download URLs)
│   ├── auth.ts                # Convex Auth config (Password provider)
│   ├── http.ts                # HTTP routes for auth
│   └── lib/
│       └── r2Client.ts        # R2 SDK wrapper
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TrackPlayer.tsx       # Wavesurfer player component
│   │   │   ├── CommentList.tsx       # Display comments
│   │   │   ├── CommentForm.tsx       # Add comment form
│   │   │   ├── VersionSelector.tsx   # Version dropdown
│   │   │   ├── TrackCard.tsx         # Track preview card
│   │   │   ├── UploadModal.tsx       # Upload UI
│   │   │   └── Navbar.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── TrackPage.tsx
│   │   │   ├── Upload.tsx
│   │   │   └── Profile.tsx
│   │   ├── hooks/
│   │   │   ├── useWaveform.ts        # Wavesurfer integration
│   │   │   └── useFileUpload.ts      # R2 upload logic
│   │   ├── lib/
│   │   │   └── convex.ts             # Convex client setup
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── .env.local                  # R2 credentials, Convex URL
└── README.md
```

---

## 9. Implementation Priorities

### Phase 1: Core Functionality (MVP)
1. **Setup**:
   - Initialize Convex project
   - Configure Cloudflare R2 bucket and credentials
   - Setup Vite React app with TypeScript
2. **Basic Track Upload**:
   - Upload MP3 files to R2
   - Store track metadata in Convex
   - Generate shareable links
3. **Playback**:
   - Integrate Wavesurfer.js
   - Display waveform and play audio
4. **Version Management**:
   - Upload multiple versions
   - Switch between versions
   - Display latest version by default

### Phase 2: Commenting
1. **General Comments**:
   - Add/display general track comments
   - Basic threading (replies)
2. **Timestamp Comments**:
   - Click waveform to add timestamp comment
   - Display timestamp markers on waveform
   - Jump to timestamp when clicking comment

### Phase 3: Enhanced Features
1. **Authentication**:
   - Convex Auth setup
   - User profiles
   - Private tracks with access control
2. **Attachments**:
   - Support file attachments on comments
   - Display/download attachments
3. **UI Polish**:
   - Responsive design refinements
   - Loading states and error handling
   - Dark mode theming

### Phase 4: Collaboration Features
1. **Notifications** (future):
   - Email notifications for new versions/comments
2. **Mentions**:
   - @mention collaborators in comments
3. **Advanced Permissions**:
   - Invite-only private tracks
   - Collaborator roles (viewer, commenter, editor)

---

## 10. Technical Considerations

### Cloudflare R2 Setup
- Create R2 bucket via Cloudflare dashboard
- Generate API tokens with read/write permissions
- Configure CORS policy to allow frontend domain
- **Environment Variables**:
  ```
  R2_ACCOUNT_ID=...
  R2_ACCESS_KEY_ID=...
  R2_SECRET_ACCESS_KEY=...
  R2_BUCKET_NAME=music-collab-files
  R2_PUBLIC_URL=https://...
  ```

### Convex Setup
- Initialize with `npx convex init`
- Configure auth provider in `convex/auth.ts` (using `@convex-dev/auth` with Password provider)
- Set up HTTP routes in `convex/http.ts` for auth endpoints
- Deploy functions with `npx convex deploy`
- **Environment Variables** (Convex dashboard):
  - Add R2 credentials as Convex environment variables
  - These are accessible in Convex actions

### Audio Processing
- **Duration Extraction**: Use browser's Audio API to get duration client-side before upload
- **Waveform Generation**: Wavesurfer.js generates waveforms from audio in browser
- **Format Support**: Rely on browser's native audio support (MP3, WAV, AAC, M4A, FLAC)

### Performance Optimizations
- Lazy load comments (pagination)
- Cache presigned URLs (1 hour expiry)
- Debounce waveform seek events
- Use Convex's reactive queries for real-time updates
- Compress waveform data if storing server-side

### Security
- Validate file types and sizes on upload
- Sanitize user input (track titles, comments)
- Rate limit uploads and comments
- Use presigned URLs with short expiry for R2 access
- Implement CSRF protection via Convex Auth

### Browser Compatibility
- Wavesurfer.js works in all modern browsers
- Test audio format support across browsers
- Fallback UI for unsupported formats

---

## 11. Success Metrics

### User Engagement
- Number of tracks uploaded
- Number of comments per track
- Active collaborators per track

### Technical Performance
- Upload success rate
- Average upload time
- Audio playback latency
- Comment load time

### User Satisfaction
- Track sharing frequency (link clicks)
- Version iteration rate (uploads per track)
- Return user rate

---

## 12. Future Enhancements (Post-MVP)

1. **Real-time Collaboration**:
   - Live cursors showing where collaborators are listening
   - Real-time comment updates (Convex already supports this)

2. **Advanced Audio Features**:
   - Stem uploads (separate tracks for vocals, drums, etc.)
   - Audio comparison tool (A/B between versions)
   - Spectral analysis visualization

3. **Project Management**:
   - Group tracks into "Projects" or "Albums"
   - Task assignments for collaborators
   - Revision approval workflow

4. **Integrations**:
   - Export to DAWs (metadata, comments as markers)
   - Slack/Discord notifications
   - Calendar integration for deadlines

5. **Mobile App**:
   - Native iOS/Android apps for on-the-go feedback

---

## 13. Getting Started Checklist

- [ ] Create Cloudflare account and R2 bucket
- [ ] Generate R2 API tokens
- [ ] Initialize Convex project (`npx convex init`)
- [ ] Create Convex schema (users, tracks, versions, comments)
- [ ] Set up Convex actions for R2 integration
- [ ] Initialize Vite React TypeScript project
- [ ] Install dependencies (Wavesurfer.js, Tailwind, Lucide, Convex React)
- [ ] Implement basic upload flow (frontend → Convex → R2)
- [ ] Integrate Wavesurfer.js for playback
- [ ] Build track page UI with player and comments
- [ ] Test end-to-end: upload → playback → comment → version management
- [ ] Deploy frontend (Vercel/Netlify) and Convex (auto-deployed)
- [ ] Configure custom domain and SSL

---

## Questions for Clarification (Resolved)

✅ Authentication: Mix of public and private tracks  
✅ Commenting: Both timestamp and general comments + attachments  
✅ Version management: Named versions with simple replacement, old versions archived  

---

## Additional Notes

- **File Formats**: Support all common audio formats (MP3, WAV, FLAC, M4A, AAC, OGG)
- **Waveform Display**: Essential for timestamp comments and visual navigation
- **Real-time Updates**: Convex provides this out-of-the-box for comments and version updates
- **Shareable Links**: Each track gets `/track/{shareableId}` where `shareableId` is a short unique string (e.g., 8-character random string)

This platform is optimized for **collaborative music creation workflows**, not just file hosting. The focus on versions, timestamp feedback, and easy sharing makes it far superior to generic file storage solutions.