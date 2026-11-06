# 1. Clients address files by record id, not by R2 key

Status: accepted (2026-11-05)

## Context

The R2 actions used to sign a GET for any key the client sent, and `deleteR2Objects` was a public action. Anyone who knew or guessed a key could read private audio, and anyone at all could delete any object in the bucket. Versions and comments shipped their `r2Key` to every viewer, so keys were easy to find.

## Decision

- Clients ask for file URLs by `versionId` or `commentId`. `convex/storage.ts` checks track access and resolves the key; `convex/r2.ts` only signs.
- Query results sent to clients leave out `r2Key`, `originalR2Key` and `attachmentR2Key`.
- Upload keys are minted on the server under `tracks/<trackId>/` or `attachments/<trackId>/`. Mutations that store a key reject keys outside the track's prefix.
- Deleting objects is an internal action, scheduled only by `convex/lib/cascade.ts`.

## Consequences

- Each attachment preview costs one action call per comment (cached for 55 minutes). Signing a batch in one call would need a Node action, since queries cannot sign.
- Attachments uploaded before this change live under `attachments/<random>/`. They still work for reading, because the key comes from the comment row.
