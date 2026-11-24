import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { scheduledDeletes, setup, signIn } from "./test.setup";

// Scheduled R2 deletes are inspected, not run.
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

type Client = Awaited<ReturnType<typeof signIn>>["as"];

async function addVersion(owner: Client, trackId: Id<"tracks">, name: string, lossless = false) {
  return owner.mutation(api.versions.create, {
    trackId,
    versionName: name,
    r2Key: `tracks/${trackId}/${name}-stream.mp3`,
    fileName: `${name}.mp3`,
    fileSize: 1,
    fileFormat: "mp3",
    duration: 60,
    ...(lossless && {
      originalR2Key: `tracks/${trackId}/${name}-original.wav`,
      originalFileName: `${name}.wav`,
      originalFileSize: 2,
      originalFileFormat: "wav",
    }),
  });
}

async function populatedTrack() {
  const t = setup();
  const owner = await signIn(t, "Owner");
  const friend = await signIn(t, "Friend");
  const { trackId } = await owner.as.mutation(api.tracks.create, { title: "Song", visibility: "public" });
  const v1 = await addVersion(owner.as, trackId, "v1", true);
  const v2 = await addVersion(owner.as, trackId, "v2");
  await owner.as.mutation(api.tracks.grantAccess, { trackId, userId: friend.userId });
  const root = await friend.as.mutation(api.comments.create, {
    versionId: v1,
    commentText: "root",
    attachmentR2Key: `attachments/${trackId}/pic.png`,
    attachmentFileName: "pic.png",
  });
  await owner.as.mutation(api.comments.create, { versionId: v1, commentText: "reply", parentCommentId: root });
  await friend.as.mutation(api.comments.create, { versionId: v2, commentText: "on v2", timestamp: 3 });
  return { t, owner, friend, trackId, v1, v2, root };
}

async function count(t: ReturnType<typeof setup>) {
  return t.run(async (ctx) => ({
    tracks: (await ctx.db.query("tracks").collect()).length,
    versions: (await ctx.db.query("versions").collect()).length,
    comments: (await ctx.db.query("comments").collect()).length,
    trackAccess: (await ctx.db.query("trackAccess").collect()).length,
    playlists: (await ctx.db.query("playlists").collect()).length,
    playlistTracks: (await ctx.db.query("playlistTracks").collect()).length,
  }));
}

describe("cascadeDelete", () => {
  test("deleting a track removes every row under it and purges all its files", async () => {
    const { t, owner, trackId } = await populatedTrack();
    await owner.as.mutation(api.tracks.deleteTrack, { trackId });

    expect(await count(t)).toEqual({
      tracks: 0,
      versions: 0,
      comments: 0,
      trackAccess: 0,
      playlists: 0,
      playlistTracks: 0,
    });
    expect(await scheduledDeletes(t)).toEqual(
      [
        `attachments/${trackId}/pic.png`,
        `tracks/${trackId}/v1-original.wav`,
        `tracks/${trackId}/v1-stream.mp3`,
        `tracks/${trackId}/v2-stream.mp3`,
      ].sort(),
    );
  });

  test("deleting the latest version re-points the track; deleting the last clears it", async () => {
    const { t, owner, trackId, v1, v2 } = await populatedTrack();

    await owner.as.mutation(api.versions.deleteVersion, { versionId: v2 });
    expect((await t.run((ctx) => ctx.db.get(trackId)))?.latestVersionId).toBe(v1);
    expect((await count(t)).comments).toBe(2); // v2's comment went with it

    await owner.as.mutation(api.versions.deleteVersion, { versionId: v1 });
    expect((await t.run((ctx) => ctx.db.get(trackId)))?.latestVersionId).toBeUndefined();
    expect((await count(t)).comments).toBe(0);
  });

  test("deleting a comment removes its replies and attachment", async () => {
    const { t, friend, trackId, root } = await populatedTrack();
    await friend.as.mutation(api.comments.deleteComment, { commentId: root });

    expect((await count(t)).comments).toBe(1);
    expect(await scheduledDeletes(t)).toEqual([`attachments/${trackId}/pic.png`]);
  });
});

describe("playlists", () => {
  /** Owner's two playlists and Friend's one, all holding the populated track; "Mix" also holds a second track. */
  async function playlistsHoldingTrack() {
    const world = await populatedTrack();
    const { owner, friend, trackId } = world;
    const { trackId: other } = await owner.as.mutation(api.tracks.create, { title: "Other", visibility: "public" });
    await addVersion(owner.as, other, "o1");
    const mix = await owner.as.mutation(api.playlists.create, { title: "Mix" });
    const solo = await owner.as.mutation(api.playlists.create, { title: "Solo" });
    const friends = await friend.as.mutation(api.playlists.create, { title: "Friend's picks" });
    for (const [client, playlistId, id] of [
      [owner.as, mix.playlistId, trackId],
      [owner.as, mix.playlistId, other],
      [owner.as, solo.playlistId, trackId],
      [friend.as, friends.playlistId, trackId],
    ] as const) {
      await client.mutation(api.playlists.addTrack, { playlistId, trackId: id });
    }
    return { ...world, other, mix, solo, friends };
  }

  test("deleting a playlist removes its entries, kills its link, and leaves tracks and other playlists alone", async () => {
    const { t, owner, mix, solo } = await playlistsHoldingTrack();
    const before = await count(t);

    await owner.as.mutation(api.playlists.deletePlaylist, { playlistId: mix.playlistId });

    expect(await count(t)).toEqual({
      ...before,
      playlists: before.playlists - 1,
      playlistTracks: before.playlistTracks - 2,
    });
    expect(await t.query(api.playlists.getByShareableId, { shareableId: mix.shareableId })).toBeNull();
    const kept = await t.query(api.playlists.getByShareableId, { shareableId: solo.shareableId });
    expect(kept?.tracks.map((track) => track.title)).toEqual(["Song"]);
    expect(await scheduledDeletes(t)).toEqual([]);
  });

  test("only the owner can delete a playlist", async () => {
    const { t, friend, mix } = await playlistsHoldingTrack();
    const before = await count(t);

    await expect(
      friend.as.mutation(api.playlists.deletePlaylist, { playlistId: mix.playlistId }),
    ).rejects.toThrow("Not authorized");
    await expect(
      t.mutation(api.playlists.deletePlaylist, { playlistId: mix.playlistId }),
    ).rejects.toThrow("Not authenticated");

    expect(await count(t)).toEqual(before);
  });

  test("deleting a track removes it from every playlist and leaves the playlists", async () => {
    const { t, owner, trackId, mix, solo, friends } = await playlistsHoldingTrack();

    await owner.as.mutation(api.tracks.deleteTrack, { trackId });

    expect(await count(t)).toMatchObject({ playlists: 3, playlistTracks: 1 });
    const seen = async (shareableId: string) => {
      const playlist = await t.query(api.playlists.getByShareableId, { shareableId });
      return playlist && { titles: playlist.tracks.map((track) => track.title), hidden: playlist.hiddenCount };
    };
    expect(await seen(mix.shareableId)).toEqual({ titles: ["Other"], hidden: 0 });
    expect(await seen(solo.shareableId)).toEqual({ titles: [], hidden: 0 });
    expect(await seen(friends.shareableId)).toEqual({ titles: [], hidden: 0 });
  });

  test("deleting an account removes its playlists and drops its tracks from other people's", async () => {
    const { t, owner, mix, solo, friends } = await playlistsHoldingTrack();

    await owner.as.mutation(api.users.deleteAccount, { deletionMode: "delete_everything" });

    expect(await count(t)).toMatchObject({ playlists: 1, playlistTracks: 0 });
    expect(await t.query(api.playlists.getByShareableId, { shareableId: mix.shareableId })).toBeNull();
    expect(await t.query(api.playlists.getByShareableId, { shareableId: solo.shareableId })).toBeNull();
    expect(await t.query(api.playlists.getByShareableId, { shareableId: friends.shareableId })).toMatchObject({
      title: "Friend's picks",
      tracks: [],
      hiddenCount: 0,
    });
  });
});

describe("deleteAccount", () => {
  test("removes owned tracks and auth records; keep_comments anonymizes comments elsewhere", async () => {
    const { t, owner, friend, trackId } = await populatedTrack();
    // Friend owns a track that Owner commented on
    const { trackId: friendsTrack } = await friend.as.mutation(api.tracks.create, { title: "Theirs" });
    const fv = await addVersion(friend.as, friendsTrack, "f1");
    await owner.as.mutation(api.comments.create, { versionId: fv, commentText: "owner was here" });
    await t.run((ctx) =>
      ctx.db.insert("authAccounts", { userId: owner.userId, provider: "password", providerAccountId: "o" }),
    );

    await owner.as.mutation(api.users.deleteAccount, { deletionMode: "keep_comments" });

    const left = await t.run(async (ctx) => ({
      user: await ctx.db.get(owner.userId),
      track: await ctx.db.get(trackId),
      accounts: await ctx.db.query("authAccounts").collect(),
      comments: await ctx.db.query("comments").collect(),
    }));
    expect(left.user).toBeNull();
    expect(left.track).toBeNull();
    expect(left.accounts).toEqual([]);
    expect(left.comments.map((c) => [c.commentText, c.authorName, c.authorId])).toEqual([
      ["owner was here", "Deleted User", undefined],
    ]);
  });

  test("delete_everything removes their comments on other tracks too", async () => {
    const { t, owner, friend } = await populatedTrack();
    const { trackId: friendsTrack } = await friend.as.mutation(api.tracks.create, { title: "Theirs" });
    const fv = await addVersion(friend.as, friendsTrack, "f1");
    await owner.as.mutation(api.comments.create, { versionId: fv, commentText: "owner was here" });

    await owner.as.mutation(api.users.deleteAccount, { deletionMode: "delete_everything" });
    expect((await count(t)).comments).toBe(0);
  });
});

describe("claimAnonymousComments", () => {
  const GUEST = "33333333-3333-4333-8333-333333333333";

  test("claims the listed comments and permanently declines the rest", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const { trackId } = await owner.as.mutation(api.tracks.create, { title: "Song", visibility: "public" });
    const versionId = await addVersion(owner.as, trackId, "v1");
    const keep = await t.mutation(api.comments.create, { versionId, commentText: "a", anonymousId: GUEST });
    await t.mutation(api.comments.create, { versionId, commentText: "b", anonymousId: GUEST });

    const me = await signIn(t, "Me");
    expect(await me.as.mutation(api.comments.claimAnonymousComments, { anonymousId: GUEST, commentIds: [keep] }))
      .toEqual({ claimedCount: 1, declinedCount: 1 });
    expect(await me.as.query(api.comments.getAnonymousCommentsForClaiming, { anonymousId: GUEST })).toEqual([]);

    const { general } = await me.as.query(api.comments.listThreads, { versionId });
    expect(general.map((c) => [c.commentText, c.authorName, c.canEdit])).toEqual([
      ["a", "Me", true],
      ["b", "Anonymous", false],
    ]);
  });

  test("an empty selection claims nothing", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const { trackId } = await owner.as.mutation(api.tracks.create, { title: "Song", visibility: "public" });
    const versionId = await addVersion(owner.as, trackId, "v1");
    await t.mutation(api.comments.create, { versionId, commentText: "a", anonymousId: GUEST });

    const me = await signIn(t, "Me");
    expect(await me.as.mutation(api.comments.claimAnonymousComments, { anonymousId: GUEST, commentIds: [] }))
      .toEqual({ claimedCount: 0, declinedCount: 1 });
  });
});
