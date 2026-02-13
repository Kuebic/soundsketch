import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    tokenIdentifier: v.string(), // Links to auth identity.tokenIdentifier
  })
    .index("by_email", ["email"])
    .index("by_token_identifier", ["tokenIdentifier"]),

  tracks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    creatorId: v.id("users"),
    creatorName: v.string(), // denormalized for display
    isPublic: v.boolean(),
    shareableId: v.string(), // unique short ID for URLs
    latestVersionId: v.optional(v.id("versions")), // Made optional for initial creation
  })
    .index("by_creator", ["creatorId"])
    .index("by_shareable_id", ["shareableId"])
    .index("by_public", ["isPublic"]),

  versions: defineTable({
    trackId: v.id("tracks"),
    versionName: v.string(),
    changeNotes: v.optional(v.string()),
    r2Key: v.string(),
    r2Bucket: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    fileFormat: v.string(),
    duration: v.number(), // seconds
    uploadedBy: v.id("users"),
  })
    .index("by_track", ["trackId"]),

  comments: defineTable({
    versionId: v.id("versions"),
    trackId: v.id("tracks"),
    authorId: v.optional(v.id("users")), // optional for guest comments
    authorName: v.string(),
    commentText: v.string(),
    timestamp: v.optional(v.number()), // seconds into track, null = general comment
    parentCommentId: v.optional(v.id("comments")), // for threading
    attachmentR2Key: v.optional(v.string()),
    attachmentFileName: v.optional(v.string()),
  })
    .index("by_version", ["versionId"])
    .index("by_track", ["trackId"])
    .index("by_parent", ["parentCommentId"])
    .index("by_timestamp", ["versionId", "timestamp"]),

  trackAccess: defineTable({
    trackId: v.id("tracks"),
    userId: v.id("users"),
    grantedBy: v.id("users"),
    grantedAt: v.number(),
  })
    .index("by_track", ["trackId"])
    .index("by_user", ["userId"])
    .index("by_track_and_user", ["trackId", "userId"]),
});
