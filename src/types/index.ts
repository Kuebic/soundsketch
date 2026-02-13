import type { Doc, Id } from "../../convex/_generated/dataModel";

export type Track = Doc<"tracks">;
export type Version = Doc<"versions">;
export type Comment = Doc<"comments">;
export type User = Doc<"users">;
export type TrackAccess = Doc<"trackAccess">;

export type TrackId = Id<"tracks">;
export type VersionId = Id<"versions">;
export type CommentId = Id<"comments">;
export type UserId = Id<"users">;
