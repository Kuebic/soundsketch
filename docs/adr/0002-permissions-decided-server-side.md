# 2. Permissions are decided on the server and sent to the client

Status: accepted (2026-11-05)

## Context

Edit/delete rights for comments were computed twice, once in `CommentItem` and once in each mutation, and the two could drift. The private-track rule was copied into two functions and missing from others (versions, comment queries, participants, file URLs), so private data was readable by id.

## Decision

- `convex/lib/access.ts` is the only code that maps (viewer, track) to a role: owner, collaborator, guest, or none.
- Queries attach the result for the UI: `tracks.getByShareableId` returns `viewerRole`, and `comments.listThreads` returns `canEdit`/`canDelete` for each comment.
- Client components render from those fields and never compare ids themselves.

## Consequences

- `listThreads` takes the guest's `anonymousId` as an argument so it can compute `canEdit` for guests. The server ignores it for signed-in users.
- Finer collaborator roles (viewer/commenter/editor, a PRD future phase) are a change to `access.ts` plus new `TrackNeed` values, not a sweep through every function.
