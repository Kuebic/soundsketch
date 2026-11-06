import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

export type Track = Doc<"tracks">;
export type User = Doc<"users">;

/** A track as seen by the current viewer, with their role on it. */
export type TrackForViewer = NonNullable<FunctionReturnType<typeof api.tracks.getByShareableId>>;
export type TrackRole = TrackForViewer["viewerRole"];

/** A version as sent to clients (no storage keys). */
export type Version = FunctionReturnType<typeof api.versions.getByTrack>[number];

/** A top-level comment with its replies, as returned by comments.listThreads. */
export type CommentThread = FunctionReturnType<typeof api.comments.listThreads>["general"][number];
/** A single comment (thread root or reply), with the viewer's permissions. */
export type CommentView = Omit<CommentThread, "replies">;

export type TrackId = Id<"tracks">;
export type VersionId = Id<"versions">;
export type CommentId = Id<"comments">;
export type UserId = Id<"users">;
