import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { setup, signIn } from "./test.setup";

type Client = Awaited<ReturnType<typeof signIn>>["as"];

async function createTrack(
  owner: Client,
  visibility: "public" | "unlisted" | "private",
  downloadsEnabled = false,
) {
  const { trackId, shareableId } = await owner.mutation(api.tracks.create, {
    title: "Demo",
    visibility,
    downloadsEnabled,
  });
  const versionId = await owner.mutation(api.versions.create, {
    trackId,
    versionName: "v1",
    r2Key: `tracks/${trackId}/a-stream.mp3`,
    fileName: "demo.mp3",
    fileSize: 1,
    fileFormat: "mp3",
    duration: 120,
  });
  return { trackId, shareableId, versionId };
}

async function world(visibility: "public" | "unlisted" | "private") {
  const t = setup();
  const owner = await signIn(t, "Owner");
  const collaborator = await signIn(t, "Collab");
  const stranger = await signIn(t, "Stranger");
  const track = await createTrack(owner.as, visibility);
  await owner.as.mutation(api.tracks.grantAccess, {
    trackId: track.trackId,
    userId: collaborator.userId,
  });
  return { t, owner, collaborator, stranger, ...track };
}

describe("private tracks", () => {
  test("are invisible to strangers and guests across every read path", async () => {
    const { t, stranger, shareableId, trackId, versionId } = await world("private");

    for (const client of [stranger.as, t]) {
      expect(await client.query(api.tracks.getByShareableId, { shareableId })).toBeNull();
      expect(await client.query(api.versions.getByTrack, { trackId })).toEqual([]);
      expect(await client.query(api.comments.listThreads, { versionId })).toEqual({
        timestamped: [],
        general: [],
      });
      expect(await client.query(api.users.getTrackParticipants, { trackId })).toEqual([]);
      await expect(
        client.query(internal.storage.versionStreamKey, { versionId }),
      ).rejects.toThrow();
      await expect(
        client.mutation(api.comments.create, { versionId, commentText: "hi" }),
      ).rejects.toThrow();
    }
  });

  test("are readable and commentable by collaborators", async () => {
    const { collaborator, shareableId, versionId } = await world("private");

    const track = await collaborator.as.query(api.tracks.getByShareableId, { shareableId });
    expect(track?.viewerRole).toBe("collaborator");

    await collaborator.as.mutation(api.comments.create, { versionId, commentText: "nice" });
    const { general } = await collaborator.as.query(api.comments.listThreads, { versionId });
    expect(general.map((c) => c.commentText)).toEqual(["nice"]);
  });

  test("collaborators cannot manage the track", async () => {
    const { collaborator, trackId } = await world("private");
    await expect(
      collaborator.as.mutation(api.tracks.updateSettings, { trackId, visibility: "public" }),
    ).rejects.toThrow("Not authorized");
    await expect(
      collaborator.as.mutation(api.tracks.deleteTrack, { trackId }),
    ).rejects.toThrow("Not authorized");
  });
});

describe("guest comments", () => {
  const GUEST = "11111111-1111-4111-8111-111111111111";
  const OTHER_GUEST = "22222222-2222-4222-8222-222222222222";

  test("only the guest holding the anonymousId can edit, and it is never exposed", async () => {
    const { t, versionId } = await world("public");
    const commentId = await t.mutation(api.comments.create, {
      versionId,
      commentText: "from a guest",
      anonymousId: GUEST,
      anonymousName: "sneaky-owl",
    });

    const mine = await t.query(api.comments.listThreads, { versionId, anonymousId: GUEST });
    expect(mine.general[0]).toMatchObject({ authorName: "sneaky-owl", canEdit: true, canDelete: true });
    expect(mine.general[0]).not.toHaveProperty("anonymousId");

    const theirs = await t.query(api.comments.listThreads, { versionId, anonymousId: OTHER_GUEST });
    expect(theirs.general[0]).toMatchObject({ canEdit: false, canDelete: false });

    await expect(
      t.mutation(api.comments.updateComment, { commentId, commentText: "x", anonymousId: OTHER_GUEST }),
    ).rejects.toThrow("Not authorized");
    await t.mutation(api.comments.updateComment, { commentId, commentText: "edited", anonymousId: GUEST });
  });

  test("track owner can delete anyone's comment; strangers cannot", async () => {
    const { owner, stranger, collaborator, versionId } = await world("public");
    const commentId = await collaborator.as.mutation(api.comments.create, {
      versionId,
      commentText: "hello",
    });

    const asOwner = await owner.as.query(api.comments.listThreads, { versionId });
    expect(asOwner.general[0]).toMatchObject({ canEdit: false, canDelete: true });

    await expect(
      stranger.as.mutation(api.comments.deleteComment, { commentId }),
    ).rejects.toThrow("Not authorized");
    await owner.as.mutation(api.comments.deleteComment, { commentId });
    expect((await owner.as.query(api.comments.listThreads, { versionId })).general).toEqual([]);
  });
});

describe("threads", () => {
  test("split timestamped and general, nest replies, and flatten reply-to-reply", async () => {
    const { owner, versionId } = await world("public");
    const late = await owner.as.mutation(api.comments.create, { versionId, commentText: "late", timestamp: 90 });
    await owner.as.mutation(api.comments.create, { versionId, commentText: "early", timestamp: 10 });
    await owner.as.mutation(api.comments.create, { versionId, commentText: "general" });
    const reply = await owner.as.mutation(api.comments.create, {
      versionId,
      commentText: "reply",
      parentCommentId: late,
      timestamp: 50, // ignored for replies
    });
    await owner.as.mutation(api.comments.create, {
      versionId,
      commentText: "reply to reply",
      parentCommentId: reply,
    });

    const { timestamped, general } = await owner.as.query(api.comments.listThreads, { versionId });
    expect(timestamped.map((c) => c.commentText)).toEqual(["early", "late"]);
    expect(general.map((c) => c.commentText)).toEqual(["general"]);
    expect(timestamped[1].replies.map((r) => [r.commentText, r.timestamp])).toEqual([
      ["reply", undefined],
      ["reply to reply", undefined],
    ]);
  });

  test("rejects attachments whose key belongs to another track", async () => {
    const { owner, versionId } = await world("public");
    await expect(
      owner.as.mutation(api.comments.create, {
        versionId,
        commentText: "x",
        attachmentR2Key: "attachments/someOtherTrack/file.png",
        attachmentFileName: "file.png",
      }),
    ).rejects.toThrow("Invalid attachment");
  });
});

describe("storage", () => {
  test("version keys must live under the track's prefix", async () => {
    const { owner, trackId } = await world("public");
    await expect(
      owner.as.mutation(api.versions.create, {
        trackId,
        versionName: "v2",
        r2Key: "tracks/another/stolen.mp3",
        fileName: "x.mp3",
        fileSize: 1,
        fileFormat: "mp3",
        duration: 1,
      }),
    ).rejects.toThrow("Invalid file key");
  });

  test("versions never expose storage keys", async () => {
    const { owner, trackId } = await world("public");
    const [version] = await owner.as.query(api.versions.getByTrack, { trackId });
    expect(version).not.toHaveProperty("r2Key");
    expect(version).not.toHaveProperty("originalR2Key");
  });

  test("downloads respect the track setting, except for the owner", async () => {
    const { owner, stranger, versionId } = await world("public");
    await expect(
      stranger.as.query(internal.storage.versionDownloadKey, { versionId }),
    ).rejects.toThrow("Downloads are not enabled");
    expect(await owner.as.query(internal.storage.versionDownloadKey, { versionId })).toMatchObject({
      fileName: "demo.mp3",
    });
  });

  test("only owners can mint version upload keys; viewers can mint attachment keys", async () => {
    const { owner, stranger, trackId } = await world("public");
    await expect(
      stranger.as.query(internal.storage.newVersionKeys, { trackId, fileName: "a.wav", needsConversion: true }),
    ).rejects.toThrow("Not authorized");
    const keys = await owner.as.query(internal.storage.newVersionKeys, {
      trackId,
      fileName: "a.wav",
      needsConversion: true,
    });
    expect(keys.streamingKey).toMatch(new RegExp(`^tracks/${trackId}/.+-stream\\.mp3$`));
    expect(keys.originalKey).toMatch(new RegExp(`^tracks/${trackId}/.+-original\\.wav$`));

    const key = await stranger.as.query(internal.storage.newAttachmentKey, { trackId, fileName: "pic.PNG" });
    expect(key).toMatch(new RegExp(`^attachments/${trackId}/.+\\.png$`));
  });
});
