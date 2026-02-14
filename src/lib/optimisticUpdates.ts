import type { OptimisticLocalStore } from "convex/browser";
import type { FunctionArgs } from "convex/server";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";

type CreateArgs = FunctionArgs<typeof api.comments.create>;

/**
 * Optimistic update for comment creation.
 * Immediately inserts a fake comment into the relevant local query cache
 * so the user sees it before the server round-trip completes.
 */
export function commentCreateOptimistic(
  localStore: OptimisticLocalStore,
  args: CreateArgs,
  viewerName: string,
  viewerId: Id<"users"> | undefined,
) {
  const fakeComment = {
    _id: crypto.randomUUID() as unknown as Id<"comments">,
    _creationTime: Date.now(),
    versionId: args.versionId,
    trackId: args.trackId,
    authorId: viewerId,
    authorName: viewerName,
    commentText: args.commentText,
    timestamp: args.timestamp,
    parentCommentId: args.parentCommentId,
    attachmentR2Key: args.attachmentR2Key,
    attachmentFileName: args.attachmentFileName,
  };

  // Reply — update getReplies for the parent
  if (args.parentCommentId) {
    for (const { args: qArgs, value } of localStore.getAllQueries(
      api.comments.getReplies,
    )) {
      if (
        value !== undefined &&
        qArgs.parentCommentId === args.parentCommentId
      ) {
        localStore.setQuery(api.comments.getReplies, qArgs, [
          ...value,
          fakeComment,
        ]);
      }
    }
    return;
  }

  // Timestamp comment — update getTimestampComments (sorted by timestamp)
  if (args.timestamp !== undefined) {
    for (const { args: qArgs, value } of localStore.getAllQueries(
      api.comments.getTimestampComments,
    )) {
      if (value !== undefined) {
        const updated = [...value, fakeComment].sort(
          (a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0),
        );
        localStore.setQuery(api.comments.getTimestampComments, qArgs, updated);
      }
    }
    return;
  }

  // General comment — update getGeneralComments (append)
  for (const { args: qArgs, value } of localStore.getAllQueries(
    api.comments.getGeneralComments,
  )) {
    if (value !== undefined) {
      localStore.setQuery(api.comments.getGeneralComments, qArgs, [
        ...value,
        fakeComment,
      ]);
    }
  }
}
