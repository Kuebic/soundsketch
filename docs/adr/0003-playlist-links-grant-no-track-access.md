# 3. A playlist link grants no access to its tracks

Status: accepted (2026-11-24)

## Context

A playlist is an ordered list of tracks with its own link, sent so a recipient can listen straight through. The owner may add any track they can view: their own, tracks shared with them, and public tracks. Some of those can be private. The obvious request is "anyone with the playlist link should hear everything in it".

Doing that would make the playlist link a second way into a private track, next to the track role in `convex/lib/access.ts`. A collaborator could put the owner's private track in a playlist and hand the link to anyone, and every file URL, version and comment check would need to know which playlist the viewer arrived from.

## Decision

- Opening a playlist needs only its link. Playlists have no visibility setting, are never listed on Home and are not searchable.
- The link grants nothing on the tracks. Each track in a playlist is resolved through `readTrack` for the current viewer, exactly as on its own page.
- Tracks the viewer has no role on are left out of the result entirely (no title, creator or duration). Only their count is returned, so the page can say "N tracks unavailable".
- Playlist access itself lives in `convex/lib/access.ts` (`readPlaylist`/`requirePlaylist`): anyone may view, only the creator may change. In line with ADR 0002 the playlist query returns `viewerRole` and the client renders owner controls from it.

## Consequences

- A playlist of private demos looks almost empty to a recipient. The owner is warned on the playlist page about private tracks and can make the ones they own unlisted in one click.
- The hidden count tells a viewer that the playlist holds something they cannot see, but not which track or whose.
- If this proves too painful, the change is a new route to a track role in `access.ts` (for example "listener via playlist"), not a bypass in the playlist query.
