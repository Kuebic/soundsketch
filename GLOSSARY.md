# Glossary

**Track**: a piece of music shared for feedback. Has a title, an owner, a visibility, and one or more versions. URL: `/track/:shareableId`.

**Version**: one uploaded take of a track ("v1", "Final Mix"). The newest is the track's `latestVersionId`.

**Streaming file**: the audio the player loads. MP3 for lossless uploads, otherwise the uploaded file itself.

**Original file**: the lossless upload (WAV/FLAC) kept next to its MP3 streaming file. Downloadable when the track has downloads enabled, and always by the owner.

**Visibility**: `public` (listed on Home), `unlisted` (anyone with the link), `private` (owner and collaborators only).

**Owner**: the user who created the track. Only the owner manages settings, versions and collaborators.

**Collaborator**: a user the owner granted access to (a `trackAccess` row). Can view and comment, including on private tracks.

**Guest**: anyone viewing a public or unlisted track without being owner or collaborator, signed in or not.

**Track role**: the viewer's relation to a track: owner, collaborator or guest. No role means the viewer cannot see the track. Decided only by `convex/lib/access.ts`.

**Comment**: feedback on a version. A **timestamped comment** points at a position in the audio and shows as a marker on the waveform; a **general comment** has no position and belongs to the discussion.

**Thread**: a top-level comment plus its replies. Replies are one level deep: replying to a reply attaches to the thread's root.

**Attachment**: one file on a comment (audio, image, PDF, text). Voice recordings made in the browser are attachments.

**Anonymous identity**: a guest's browser-generated `anonymousId` (UUID) and display name ("sneaky-owl"), kept in localStorage. Proves authorship of guest comments, so the server never sends it to other clients.

**Claim**: after signing in, a user can take ownership of the guest comments made under their anonymous identity. Unclaimed ones are permanently declined.

**Queue**: the tracks the listener will hear in order, taken from the track list where they pressed play, starting at the track they picked. Each track in the queue plays its latest version. The queue ends after the last track; it does not loop.

**Cascade**: deleting a track, version or comment along with everything under it, including R2 files. Done only by `convex/lib/cascade.ts`.
