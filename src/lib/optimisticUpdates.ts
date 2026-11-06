import type { OptimisticLocalStore } from "convex/browser";
import type { FunctionArgs } from "convex/server";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import type { CommentThread, CommentView } from "@/types";

type CreateArgs = FunctionArgs<typeof api.comments.create>;

/**
 * Optimistic update for comment creation.
 * Inserts a placeholder comment into every cached listThreads result so the
 * user sees it before the server round-trip completes.
 */
export function commentCreateOptimistic(
  localStore: OptimisticLocalStore,
  args: CreateArgs,
  viewerName: string,
  viewerId: Id<"users"> | undefined,
) {
  const fake: CommentView = {
    _id: crypto.randomUUID() as Id<"comments">,
    _creationTime: Date.now(),
    versionId: args.versionId,
    authorId: viewerId,
    authorName: viewerName,
    commentText: args.commentText,
    timestamp: args.parentCommentId ? undefined : args.timestamp,
    parentCommentId: args.parentCommentId,
    attachmentFileName: args.attachmentFileName,
    hasAttachment: false, // attachment URL needs the real comment id
    canEdit: false, // the placeholder id is not real yet
    canDelete: false,
  };

  for (const { args: qArgs, value } of localStore.getAllQueries(api.comments.listThreads)) {
    if (value === undefined) continue;

    if (args.parentCommentId) {
      const addReply = (t: CommentThread) =>
        t._id === args.parentCommentId ? { ...t, replies: [...t.replies, fake] } : t;
      localStore.setQuery(api.comments.listThreads, qArgs, {
        timestamped: value.timestamped.map(addReply),
        general: value.general.map(addReply),
      });
    } else if (qArgs.versionId === args.versionId) {
      const thread: CommentThread = { ...fake, replies: [] };
      localStore.setQuery(
        api.comments.listThreads,
        qArgs,
        fake.timestamp !== undefined
          ? {
              ...value,
              timestamped: [...value.timestamped, thread].sort(
                (a, b) => a.timestamp! - b.timestamp!,
              ),
            }
          : { ...value, general: [...value.general, thread] },
      );
    }
  }
}
