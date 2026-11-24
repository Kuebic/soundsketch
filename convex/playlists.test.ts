import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { setup, signIn } from "./test.setup";

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
