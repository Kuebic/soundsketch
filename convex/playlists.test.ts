import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { setup, signIn } from "./test.setup";

type Client = Awaited<ReturnType<typeof signIn>>["as"];
type Visibility = "public" | "unlisted" | "private";

/** A track with one version of the given length, so it has audio to play. */
async function createTrack(owner: Client, title: string, visibility: Visibility, duration = 60) {
  const { trackId } = await owner.mutation(api.tracks.create, { title, visibility });
  await owner.mutation(api.versions.create, {
    trackId,
    versionName: "v1",
    r2Key: `tracks/${trackId}/a-stream.mp3`,
    fileName: "demo.mp3",
    fileSize: 1,
    fileFormat: "mp3",
    duration,
  });
  return trackId;
}

/** A ConvexError carrying this code. convex-test hands `data` over as its JSON text. */
function coded(code: string) {
  return { name: "ConvexError", data: expect.stringContaining(`"code":"${code}"`) };
}

async function titlesSeenBy(client: Pick<Client, "query">, shareableId: string) {
  const playlist = await client.query(api.playlists.getByShareableId, { shareableId });
  return playlist?.tracks.map((track) => track.title);
}

describe("creating a playlist", () => {
  test("a signed-in user creates a playlist and finds it among their playlists", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");

    const { shareableId } = await owner.as.mutation(api.playlists.create, {
      title: "  Demos for Sam  ",
      description: "  Rough mixes  ",
    });

    const mine = await owner.as.query(api.playlists.getMyPlaylists, {});
    expect(mine).toMatchObject([
      { title: "Demos for Sam", description: "Rough mixes", shareableId },
    ]);
  });

  test("an empty title is rejected", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    await expect(owner.as.mutation(api.playlists.create, { title: "   " })).rejects.toThrow(
      "Title cannot be empty",
    );
  });

  test("a signed-out caller cannot create a playlist", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    await owner.as.mutation(api.playlists.create, { title: "Someone else's" });
    await expect(t.mutation(api.playlists.create, { title: "Demos" })).rejects.toThrow(
      "Not authenticated",
    );
    expect(await t.query(api.playlists.getMyPlaylists, {})).toEqual([]);
  });

  test("playlists are listed only for their owner", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const stranger = await signIn(t, "Stranger");
    await owner.as.mutation(api.playlists.create, { title: "Demos" });
    expect(await stranger.as.query(api.playlists.getMyPlaylists, {})).toEqual([]);
  });
});

describe("opening a playlist by its link", () => {
  test("anyone with the link sees it; only the creator is its owner", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const stranger = await signIn(t, "Stranger");
    const { shareableId } = await owner.as.mutation(api.playlists.create, {
      title: "Demos",
      description: "Rough mixes",
    });

    const seen = { title: "Demos", description: "Rough mixes", creatorName: "Owner", shareableId };
    expect(await owner.as.query(api.playlists.getByShareableId, { shareableId })).toMatchObject({
      ...seen,
      viewerRole: "owner",
    });
    for (const client of [stranger.as, t]) {
      expect(await client.query(api.playlists.getByShareableId, { shareableId })).toMatchObject({
        ...seen,
        viewerRole: "guest",
      });
    }
  });

  test("shows the creator's current name after they rename themselves", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const { shareableId } = await owner.as.mutation(api.playlists.create, { title: "Demos" });
    await owner.as.mutation(api.users.updateName, { name: "Renamed" });
    expect(await t.query(api.playlists.getByShareableId, { shareableId })).toMatchObject({
      creatorName: "Renamed",
    });
  });

  test("an unknown link returns null", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    await owner.as.mutation(api.playlists.create, { title: "Demos" });
    expect(await t.query(api.playlists.getByShareableId, { shareableId: "nope" })).toBeNull();
  });

  test("playlists never show up in the public track search", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    await owner.as.mutation(api.playlists.create, { title: "Demos" });
    expect(await t.query(api.tracks.searchPublicTracks, { searchText: "" })).toEqual([]);
    expect(await t.query(api.tracks.searchPublicTracks, { searchText: "Demos" })).toEqual([]);
  });
});

describe("adding tracks to a playlist", () => {
  test("tracks land at the end and are listed in that order with their durations", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const { playlistId, shareableId } = await owner.as.mutation(api.playlists.create, { title: "Demos" });
    const first = await createTrack(owner.as, "First", "public", 90);
    const second = await createTrack(owner.as, "Second", "unlisted", 45);

    await owner.as.mutation(api.playlists.addTrack, { playlistId, trackId: first });
    await owner.as.mutation(api.playlists.addTrack, { playlistId, trackId: second });

    const playlist = await t.query(api.playlists.getByShareableId, { shareableId });
    expect(playlist?.tracks).toMatchObject([
      { _id: first, title: "First", creatorName: "Owner", duration: 90 },
      { _id: second, title: "Second", creatorName: "Owner", duration: 45 },
    ]);
    expect(playlist?.hiddenCount).toBe(0);
  });

  test("the owner can add their own, shared-with-them and public tracks", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const friend = await signIn(t, "Friend");
    const { playlistId, shareableId } = await owner.as.mutation(api.playlists.create, { title: "Mix" });
    const own = await createTrack(owner.as, "Own private", "private");
    const shared = await createTrack(friend.as, "Shared private", "private");
    const reference = await createTrack(friend.as, "Public reference", "public");
    await friend.as.mutation(api.tracks.grantAccess, { trackId: shared, userId: owner.userId });

    for (const trackId of [own, shared, reference]) {
      await owner.as.mutation(api.playlists.addTrack, { playlistId, trackId });
    }

    expect(await titlesSeenBy(owner.as, shareableId)).toEqual([
      "Own private",
      "Shared private",
      "Public reference",
    ]);
  });

  test("is rejected for non-owners, unviewable tracks and duplicates", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const stranger = await signIn(t, "Stranger");
    const { playlistId, shareableId } = await owner.as.mutation(api.playlists.create, { title: "Mix" });
    const track = await createTrack(owner.as, "Song", "public");
    const secret = await createTrack(stranger.as, "Secret", "private");

    await expect(
      stranger.as.mutation(api.playlists.addTrack, { playlistId, trackId: track }),
    ).rejects.toThrow("Not authorized");
    await expect(t.mutation(api.playlists.addTrack, { playlistId, trackId: track })).rejects.toThrow(
      "Not authenticated",
    );
    await expect(
      owner.as.mutation(api.playlists.addTrack, { playlistId, trackId: secret }),
    ).rejects.toThrow("Track not found");

    await owner.as.mutation(api.playlists.addTrack, { playlistId, trackId: track });
    await expect(
      owner.as.mutation(api.playlists.addTrack, { playlistId, trackId: track }),
    ).rejects.toMatchObject(coded("already_in_playlist"));

    expect(await titlesSeenBy(owner.as, shareableId)).toEqual(["Song"]);
  });

  test("a 101st track is rejected", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const { playlistId, shareableId } = await owner.as.mutation(api.playlists.create, { title: "Big" });
    for (let i = 0; i < 100; i++) {
      const { trackId } = await owner.as.mutation(api.tracks.create, { title: `Track ${i}` });
      await owner.as.mutation(api.playlists.addTrack, { playlistId, trackId });
    }
    const { trackId: oneTooMany } = await owner.as.mutation(api.tracks.create, { title: "Track 100" });

    await expect(
      owner.as.mutation(api.playlists.addTrack, { playlistId, trackId: oneTooMany }),
    ).rejects.toMatchObject(coded("playlist_full"));
    expect(await titlesSeenBy(owner.as, shareableId)).toHaveLength(100);
  });

  test("my playlists report how many tracks each holds", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const { playlistId } = await owner.as.mutation(api.playlists.create, { title: "Mix" });
    await owner.as.mutation(api.playlists.create, { title: "Empty" });
    for (const title of ["A", "B"]) {
      const trackId = await createTrack(owner.as, title, "public");
      await owner.as.mutation(api.playlists.addTrack, { playlistId, trackId });
    }

    const mine = await owner.as.query(api.playlists.getMyPlaylists, {});
    expect(mine.map((p) => [p.title, p.trackCount])).toEqual([
      ["Empty", 0],
      ["Mix", 2],
    ]);
  });
});

describe("tracks in a playlist are resolved for each viewer", () => {
  async function mixedPlaylist() {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const collaborator = await signIn(t, "Collab");
    const stranger = await signIn(t, "Stranger");
    const { playlistId, shareableId } = await owner.as.mutation(api.playlists.create, { title: "Mix" });
    const open = await createTrack(owner.as, "Open", "public");
    const secret = await createTrack(owner.as, "Hush-hush", "private", 77);
    const linked = await createTrack(owner.as, "Linked", "unlisted");
    await owner.as.mutation(api.tracks.grantAccess, { trackId: secret, userId: collaborator.userId });
    for (const trackId of [open, secret, linked]) {
      await owner.as.mutation(api.playlists.addTrack, { playlistId, trackId });
    }
    return { t, owner, collaborator, stranger, shareableId, secret };
  }

  test("the owner and a collaborator on the private track see every track", async () => {
    const { owner, collaborator, shareableId } = await mixedPlaylist();
    for (const client of [owner.as, collaborator.as]) {
      const playlist = await client.query(api.playlists.getByShareableId, { shareableId });
      expect(playlist?.tracks.map((track) => track.title)).toEqual(["Open", "Hush-hush", "Linked"]);
      expect(playlist?.hiddenCount).toBe(0);
    }
    // Seeing a private track through a grant does not make the collaborator the playlist's owner.
    expect(await collaborator.as.query(api.playlists.getByShareableId, { shareableId })).not.toHaveProperty(
      "privateTracks",
    );
  });

  test("strangers and signed-out guests get the rest, a hidden count, and nothing about the private track", async () => {
    const { t, stranger, shareableId, secret } = await mixedPlaylist();
    for (const client of [stranger.as, t]) {
      const playlist = await client.query(api.playlists.getByShareableId, { shareableId });
      expect(playlist?.tracks.map((track) => track.title)).toEqual(["Open", "Linked"]);
      expect(playlist?.hiddenCount).toBe(1);

      const everything = JSON.stringify(playlist);
      expect(everything).not.toContain("Hush-hush");
      expect(everything).not.toContain(secret);
      expect(playlist?.tracks.map((track) => track.duration)).toEqual([60, 60]);
    }
  });

  test("the playlist owner gets no special pass: a track they lose access to is hidden from them too", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const musician = await signIn(t, "Musician");
    const { playlistId, shareableId } = await owner.as.mutation(api.playlists.create, { title: "Mix" });
    const mine = await createTrack(owner.as, "Mine", "public", 60);
    const theirs = await createTrack(musician.as, "Theirs", "private", 4242);
    await musician.as.mutation(api.tracks.grantAccess, { trackId: theirs, userId: owner.userId });
    await owner.as.mutation(api.playlists.addTrack, { playlistId, trackId: mine });
    await owner.as.mutation(api.playlists.addTrack, { playlistId, trackId: theirs });

    await musician.as.mutation(api.tracks.revokeAccess, { trackId: theirs, userId: owner.userId });

    const playlist = await owner.as.query(api.playlists.getByShareableId, { shareableId });
    expect(playlist).toEqual({
      _id: playlistId,
      title: "Mix",
      description: undefined,
      creatorName: "Owner",
      shareableId,
      viewerRole: "owner",
      tracks: [expect.objectContaining({ _id: mine, title: "Mine", creatorName: "Owner", duration: 60 })],
      hiddenCount: 1,
      privateTracks: [],
    });
    expect(Object.keys(playlist!.tracks[0]).sort()).toEqual(
      [
        "_creationTime",
        "_id",
        "creatorId",
        "creatorName",
        "downloadsEnabled",
        "duration",
        "latestVersionId",
        "shareableId",
        "title",
        "visibility",
      ].sort(),
    );
    // The musician still sees their own track through the same link.
    expect(await titlesSeenBy(musician.as, shareableId)).toEqual(["Mine", "Theirs"]);
  });

  test("a track made private after it was added drops out for guests", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const { playlistId, shareableId } = await owner.as.mutation(api.playlists.create, { title: "Mix" });
    const trackId = await createTrack(owner.as, "Song", "public");
    await owner.as.mutation(api.playlists.addTrack, { playlistId, trackId });
    expect(await titlesSeenBy(t, shareableId)).toEqual(["Song"]);

    await owner.as.mutation(api.tracks.updateSettings, { trackId, visibility: "private" });

    expect(await titlesSeenBy(t, shareableId)).toEqual([]);
    expect(await titlesSeenBy(owner.as, shareableId)).toEqual(["Song"]);
  });

  test("listed tracks never carry storage keys", async () => {
    const { owner, shareableId } = await mixedPlaylist();
    const playlist = await owner.as.query(api.playlists.getByShareableId, { shareableId });
    expect(JSON.stringify(playlist)).not.toContain("a-stream.mp3");
  });
});

describe("the owner edits a playlist", () => {
  async function playlistOf(titles: string[]) {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const stranger = await signIn(t, "Stranger");
    const { playlistId, shareableId } = await owner.as.mutation(api.playlists.create, {
      title: "Mix",
      description: "First draft",
    });
    const ids: Record<string, Awaited<ReturnType<typeof createTrack>>> = {};
    for (const title of titles) {
      ids[title] = await createTrack(owner.as, title, "public");
      await owner.as.mutation(api.playlists.addTrack, { playlistId, trackId: ids[title] });
    }
    return { t, owner, stranger, playlistId, shareableId, ids };
  }

  test("renames it and edits its description; recipients see the change", async () => {
    const { t, owner, playlistId, shareableId } = await playlistOf([]);

    await owner.as.mutation(api.playlists.update, { playlistId, title: "  Final mixes " });
    expect(await t.query(api.playlists.getByShareableId, { shareableId })).toMatchObject({
      title: "Final mixes",
      description: "First draft",
    });

    await owner.as.mutation(api.playlists.update, { playlistId, description: " Second draft " });
    expect(await t.query(api.playlists.getByShareableId, { shareableId })).toMatchObject({
      title: "Final mixes",
      description: "Second draft",
    });

    await owner.as.mutation(api.playlists.update, { playlistId, description: "   " });
    const cleared = await t.query(api.playlists.getByShareableId, { shareableId });
    expect(cleared?.title).toBe("Final mixes");
    expect(cleared?.description).toBeUndefined();

    await expect(
      owner.as.mutation(api.playlists.update, { playlistId, title: " " }),
    ).rejects.toThrow("Title cannot be empty");
  });

  test("moves a track up or down one place", async () => {
    const { t, owner, playlistId, shareableId, ids } = await playlistOf(["A", "B", "C"]);

    await owner.as.mutation(api.playlists.moveTrack, { playlistId, trackId: ids.C, direction: "up" });
    expect(await titlesSeenBy(t, shareableId)).toEqual(["A", "C", "B"]);

    await owner.as.mutation(api.playlists.moveTrack, { playlistId, trackId: ids.A, direction: "down" });
    expect(await titlesSeenBy(t, shareableId)).toEqual(["C", "A", "B"]);
  });

  test("the first track cannot move up and the last cannot move down", async () => {
    const { t, owner, playlistId, shareableId, ids } = await playlistOf(["A", "B", "C"]);

    await owner.as.mutation(api.playlists.moveTrack, { playlistId, trackId: ids.A, direction: "up" });
    await owner.as.mutation(api.playlists.moveTrack, { playlistId, trackId: ids.C, direction: "down" });

    expect(await titlesSeenBy(t, shareableId)).toEqual(["A", "B", "C"]);
  });

  test("a move steps over an entry the owner cannot see, so it always changes what they see", async () => {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const musician = await signIn(t, "Musician");
    const { playlistId, shareableId } = await owner.as.mutation(api.playlists.create, { title: "Mix" });
    const a = await createTrack(owner.as, "A", "public");
    const lost = await createTrack(musician.as, "Lost", "private");
    const b = await createTrack(owner.as, "B", "public");
    await musician.as.mutation(api.tracks.grantAccess, { trackId: lost, userId: owner.userId });
    for (const trackId of [a, lost, b]) {
      await owner.as.mutation(api.playlists.addTrack, { playlistId, trackId });
    }
    await musician.as.mutation(api.tracks.revokeAccess, { trackId: lost, userId: owner.userId });

    await owner.as.mutation(api.playlists.moveTrack, { playlistId, trackId: b, direction: "up" });

    expect(await titlesSeenBy(owner.as, shareableId)).toEqual(["B", "A"]);
    // The two swapped places; the entry between them stayed put.
    expect(await titlesSeenBy(musician.as, shareableId)).toEqual(["B", "Lost", "A"]);
  });

  test("removes a track from the playlist and leaves the track itself alone", async () => {
    const { t, owner, playlistId, shareableId, ids } = await playlistOf(["A", "B", "C"]);

    await owner.as.mutation(api.playlists.removeTrack, { playlistId, trackId: ids.B });

    expect(await titlesSeenBy(t, shareableId)).toEqual(["A", "C"]);
    const mine = await owner.as.query(api.tracks.getMyTracks, {});
    expect(mine.map((track) => track.title).sort()).toEqual(["A", "B", "C"]);

    // It can go back in, at the end.
    await owner.as.mutation(api.playlists.addTrack, { playlistId, trackId: ids.B });
    expect(await titlesSeenBy(t, shareableId)).toEqual(["A", "C", "B"]);
  });

  test("nobody else can rename, reorder or remove", async () => {
    const { t, stranger, playlistId, shareableId, ids } = await playlistOf(["A", "B"]);
    const attempts = (client: Pick<Client, "mutation">) => [
      client.mutation(api.playlists.update, { playlistId, title: "Hijacked" }),
      client.mutation(api.playlists.moveTrack, { playlistId, trackId: ids.B, direction: "up" }),
      client.mutation(api.playlists.removeTrack, { playlistId, trackId: ids.A }),
    ];

    for (const attempt of attempts(stranger.as)) await expect(attempt).rejects.toThrow("Not authorized");
    for (const attempt of attempts(t)) await expect(attempt).rejects.toThrow("Not authenticated");

    expect(await t.query(api.playlists.getByShareableId, { shareableId })).toMatchObject({ title: "Mix" });
    expect(await titlesSeenBy(t, shareableId)).toEqual(["A", "B"]);
  });

  test("owning a track in someone's playlist gives no say over the playlist", async () => {
    const { t, owner, stranger, playlistId, shareableId, ids } = await playlistOf(["A"]);
    const theirs = await createTrack(stranger.as, "Theirs", "public");
    await owner.as.mutation(api.playlists.addTrack, { playlistId, trackId: theirs });

    await expect(
      stranger.as.mutation(api.playlists.moveTrack, { playlistId, trackId: theirs, direction: "up" }),
    ).rejects.toThrow("Not authorized");
    await expect(
      stranger.as.mutation(api.playlists.removeTrack, { playlistId, trackId: theirs }),
    ).rejects.toThrow("Not authorized");
    expect(await titlesSeenBy(t, shareableId)).toEqual(["A", "Theirs"]);

    await owner.as.mutation(api.playlists.moveTrack, { playlistId, trackId: theirs, direction: "up" });
    expect(await titlesSeenBy(t, shareableId)).toEqual(["Theirs", "A"]);
    await owner.as.mutation(api.playlists.removeTrack, { playlistId, trackId: theirs });
    expect(await titlesSeenBy(t, shareableId)).toEqual(["A"]);
    expect(ids.A).toBeDefined();
  });
});

describe("the owner is told which tracks recipients may not hear", () => {
  async function playlistWithPrivateTracks() {
    const t = setup();
    const owner = await signIn(t, "Owner");
    const musician = await signIn(t, "Musician");
    const stranger = await signIn(t, "Stranger");
    const { playlistId, shareableId } = await owner.as.mutation(api.playlists.create, { title: "Mix" });
    const open = await createTrack(owner.as, "Open", "public");
    const mine = await createTrack(owner.as, "My private", "private");
    const theirs = await createTrack(musician.as, "Their private", "private");
    const linked = await createTrack(owner.as, "Linked", "unlisted");
    await musician.as.mutation(api.tracks.grantAccess, { trackId: theirs, userId: owner.userId });
    for (const trackId of [open, mine, theirs, linked]) {
      await owner.as.mutation(api.playlists.addTrack, { playlistId, trackId });
    }
    return { t, owner, musician, stranger, shareableId, mine, theirs };
  }

  test("private tracks are listed for the owner, with whether they can change each one", async () => {
    const { owner, shareableId, mine, theirs } = await playlistWithPrivateTracks();

    const playlist = await owner.as.query(api.playlists.getByShareableId, { shareableId });

    expect(playlist?.privateTracks).toEqual([
      { trackId: mine, title: "My private", creatorName: "Owner", canMakeUnlisted: true },
      { trackId: theirs, title: "Their private", creatorName: "Musician", canMakeUnlisted: false },
    ]);
  });

  test("nobody but the playlist owner receives the list, even a viewer who can see the private tracks", async () => {
    const { t, musician, stranger, shareableId } = await playlistWithPrivateTracks();

    for (const client of [musician.as, stranger.as, t]) {
      const playlist = await client.query(api.playlists.getByShareableId, { shareableId });
      expect(playlist).not.toBeNull();
      expect(playlist).not.toHaveProperty("privateTracks");
    }
    // The musician does see their own private track in the list itself.
    expect(await titlesSeenBy(musician.as, shareableId)).toEqual(["Open", "Their private", "Linked"]);
  });

  test("making a track unlisted clears it from the list; none left means an empty list", async () => {
    const { t, owner, musician, shareableId, mine, theirs } = await playlistWithPrivateTracks();

    await owner.as.mutation(api.tracks.updateSettings, { trackId: mine, visibility: "unlisted" });
    const afterOne = await owner.as.query(api.playlists.getByShareableId, { shareableId });
    expect(afterOne?.privateTracks?.map((track) => track.title)).toEqual(["Their private"]);
    // Unlisted, not public: reachable through the link, absent from Home.
    expect(afterOne?.tracks.find((track) => track._id === mine)?.visibility).toBe("unlisted");
    expect(await titlesSeenBy(t, shareableId)).toEqual(["Open", "My private", "Linked"]);
    const onHome = await t.query(api.tracks.searchPublicTracks, { searchText: "" });
    expect(onHome.map((track) => track.title)).toEqual(["Open"]);

    await musician.as.mutation(api.tracks.updateSettings, { trackId: theirs, visibility: "public" });
    const afterBoth = await owner.as.query(api.playlists.getByShareableId, { shareableId });
    expect(afterBoth?.privateTracks).toEqual([]);
  });

  test("a private track the owner lost access to is not named", async () => {
    const { owner, musician, shareableId, theirs } = await playlistWithPrivateTracks();
    await musician.as.mutation(api.tracks.revokeAccess, { trackId: theirs, userId: owner.userId });

    const playlist = await owner.as.query(api.playlists.getByShareableId, { shareableId });

    expect(playlist?.privateTracks?.map((track) => track.title)).toEqual(["My private"]);
    expect(playlist?.hiddenCount).toBe(1);
    expect(JSON.stringify(playlist)).not.toContain("Their private");
  });
});
