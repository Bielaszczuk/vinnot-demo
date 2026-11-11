import { describe, expect, it } from "@jest/globals";
import {
  mapFollowUser,
  mapPublicCellarWine,
  mapPublicProfile,
  mapSocialPage,
  mapSuggestedUser,
  mapUserReview,
} from "./social.mappers";

const reviewer = {
  id: "u-2",
  username: "bruno",
  displayName: "Bruno Díaz",
  avatarUrl: "https://cdn.vinnot.com/bruno.jpg",
  tier: "RESERVA",
};

describe("social.mappers", () => {
  it("maps a public profile with every social field", () => {
    const profile = mapPublicProfile({
      id: "u-1",
      username: "ana",
      fullName: "Ana Pérez",
      avatarUrl: null,
      roles: ["ROLE_USER"],
      createdAt: "2026-01-02T00:00:00Z",
      bio: "Malbec y montaña",
      tier: "BARRICA",
      followersCount: 12,
      followingCount: 3,
      reviewsCount: 8,
      cellarCount: 20,
      cellarVisible: true,
      following: true,
      followsYou: false,
      affinityPercent: 73,
      tasteWheel: [
        { kind: "TYPE", value: "RED", label: "Tinto", score: 4.5 },
        { kind: "GRAPE", value: "malbec", label: "Malbec", score: 7 },
        { kind: "OTHER", value: "x", label: "X", score: 1 },
      ],
    });
    expect(profile).toEqual({
      id: "u-1",
      username: "ana",
      displayName: "Ana Pérez",
      avatarUrl: null,
      bio: "Malbec y montaña",
      tier: "BARRICA",
      createdAt: new Date("2026-01-02T00:00:00Z"),
      followersCount: 12,
      followingCount: 3,
      reviewsCount: 8,
      cellarCount: 20,
      cellarVisible: true,
      following: true,
      followsYou: false,
      affinityPercent: 73,
      // Scores are clamped to the 0-5 scale and unknown kinds are dropped.
      tasteWheel: [
        { kind: "TYPE", value: "RED", label: "Tinto", score: 4.5, tone: null, ratedWines: 0 },
        { kind: "GRAPE", value: "malbec", label: "Malbec", score: 5, tone: null, ratedWines: 0 },
      ],
      tasteTraits: null,
    });
  });

  it("keeps a hidden cellar and a missing taste wheel as null, and falls back to the username", () => {
    const profile = mapPublicProfile({
      id: "u-1",
      username: "ana",
      fullName: "  ",
      createdAt: "2026-01-02T00:00:00Z",
      tier: "UNKNOWN",
      cellarCount: null,
      cellarVisible: false,
      tasteWheel: null,
    });
    expect(profile).toMatchObject({
      displayName: "ana",
      avatarUrl: null,
      bio: null,
      tier: null,
      followersCount: 0,
      followingCount: 0,
      reviewsCount: 0,
      cellarCount: null,
      cellarVisible: false,
      following: false,
      followsYou: false,
      affinityPercent: null,
      tasteWheel: null,
    });
  });

  it("treats a negative taste score as zero", () => {
    const profile = mapPublicProfile({
      id: "u-1",
      username: "ana",
      createdAt: "2026-01-02T00:00:00Z",
      tasteWheel: [{ kind: "GRAPE", value: "syrah", label: "", score: -1 }],
    });
    expect(profile.tasteWheel).toEqual([
      { kind: "GRAPE", value: "syrah", label: "syrah", score: 0, tone: null, ratedWines: 0 },
    ]);
  });

  it("maps region entries, the tone and the rated wines of each wheel entry", () => {
    const profile = mapPublicProfile({
      id: "u-1",
      username: "ana",
      createdAt: "2026-01-02T00:00:00Z",
      tasteWheel: [
        { kind: "GRAPE", value: "agiorgitiko", label: "Agiorgitiko", score: 4.2, tone: "red", ratedWines: 3 },
        { kind: "REGION", value: "mendoza", label: "Mendoza", score: 4, tone: null, ratedWines: 7.6 },
        { kind: "TYPE", value: "WHITE", label: "WHITE", score: 3, tone: " WHITE ", ratedWines: -2 },
      ],
    });
    expect(profile.tasteWheel).toEqual([
      { kind: "GRAPE", value: "agiorgitiko", label: "Agiorgitiko", score: 4.2, tone: "RED", ratedWines: 3 },
      { kind: "REGION", value: "mendoza", label: "Mendoza", score: 4, tone: null, ratedWines: 8 },
      // A count below zero is read as none.
      { kind: "TYPE", value: "WHITE", label: "WHITE", score: 3, tone: "WHITE", ratedWines: 0 },
    ]);
  });

  it("reads an older wheel entry without tone or rated wines as null and zero", () => {
    const profile = mapPublicProfile({
      id: "u-1",
      username: "ana",
      createdAt: "2026-01-02T00:00:00Z",
      tasteWheel: [{ kind: "GRAPE", value: "malbec", label: "Malbec", score: 4, tone: "  ", ratedWines: null }],
    });
    expect(profile.tasteWheel).toEqual([
      { kind: "GRAPE", value: "malbec", label: "Malbec", score: 4, tone: null, ratedWines: 0 },
    ]);
  });

  it("maps the taste traits, clamping values, dropping unknown ones and sorting families", () => {
    const profile = mapPublicProfile({
      id: "u-1",
      username: "ana",
      createdAt: "2026-01-02T00:00:00Z",
      tasteTraits: {
        structure: [
          { trait: "BODY", score: 72, wines: 9, adjusted: true },
          { trait: "ACIDITY", score: 140, wines: 4, adjusted: false },
          { trait: "SMOKINESS", score: 50, wines: 3 },
          { trait: "TANNIN", score: -5, wines: -1 },
          { trait: "SWEETNESS", score: Number.NaN, wines: 3 },
        ],
        families: [
          { family: "OAK", percent: 40 },
          { family: "EARTHY", percent: 90 },
          { family: "FRUIT", percent: 85 },
          { family: "MINERAL", percent: 120 },
          { family: "FLORAL", percent: Number.POSITIVE_INFINITY },
        ],
      },
    });
    expect(profile.tasteTraits).toEqual({
      // Contract order is kept for the structure.
      structure: [
        { trait: "BODY", score: 72, wines: 9, adjusted: true },
        { trait: "ACIDITY", score: 100, wines: 4, adjusted: false },
        { trait: "TANNIN", score: 0, wines: 0, adjusted: false },
      ],
      families: [
        { family: "MINERAL", percent: 100 },
        { family: "FRUIT", percent: 85 },
        { family: "OAK", percent: 40 },
      ],
      fromQuiz: false,
    });
  });

  it("says whether the taste traits come from the taste quiz", () => {
    const base = { id: "u-1", username: "ana", createdAt: "2026-01-02T00:00:00Z" };
    const quiz = mapPublicProfile({ ...base, tasteTraits: { structure: [], families: [], fromQuiz: true } });
    expect(quiz.tasteTraits?.fromQuiz).toBe(true);
    const real = mapPublicProfile({ ...base, tasteTraits: { structure: [], families: [], fromQuiz: false } });
    expect(real.tasteTraits?.fromQuiz).toBe(false);
  });

  it("keeps missing taste traits as null and missing lists as empty", () => {
    const base = { id: "u-1", username: "ana", createdAt: "2026-01-02T00:00:00Z" };
    expect(mapPublicProfile(base).tasteTraits).toBeNull();
    expect(mapPublicProfile({ ...base, tasteTraits: null }).tasteTraits).toBeNull();
    expect(mapPublicProfile({ ...base, tasteTraits: { structure: null, families: undefined } }).tasteTraits).toEqual({
      structure: [],
      families: [],
      fromQuiz: false,
    });
    expect(mapPublicProfile({ ...base, tasteTraits: { structure: [{ trait: "BODY", score: 50 }] } }).tasteTraits).toEqual({
      // A trait without the `adjusted` flag was not set by hand.
      structure: [{ trait: "BODY", score: 50, wines: 0, adjusted: false }],
      families: [],
      fromQuiz: false,
    });
  });

  it("maps follow rows and suggestions", () => {
    expect(mapFollowUser({ ...reviewer, following: true })).toEqual({
      id: "u-2",
      username: "bruno",
      displayName: "Bruno Díaz",
      avatarUrl: "https://cdn.vinnot.com/bruno.jpg",
      tier: "RESERVA",
      following: true,
    });
    expect(mapFollowUser({ id: "u-3", username: "caro" })).toEqual({
      id: "u-3",
      username: "caro",
      displayName: "caro",
      avatarUrl: null,
      tier: null,
      following: false,
    });
    expect(mapSuggestedUser({ ...reviewer, affinityPercent: 81, reviewsCount: 9 })).toMatchObject({
      id: "u-2",
      affinityPercent: 81,
      reviewsCount: 9,
    });
    expect(mapSuggestedUser({ id: "u-4", username: "dani" })).toMatchObject({
      affinityPercent: null,
      reviewsCount: 0,
    });
  });

  it("maps a review from the feed or a profile", () => {
    const review = mapUserReview({
      reviewId: "r-1",
      rating: 4,
      title: "Gran Malbec",
      comment: "Fruta negra",
      vintage: 2019,
      createdAt: "2026-11-01T10:00:00Z",
      reviewer,
      wine: { id: "w-1", name: "Catena", imageUrl: "https://cdn/w.jpg", type: "RED", wineryName: "Catena Zapata" },
    });
    expect(review).toEqual({
      id: "r-1",
      rating: 4,
      title: "Gran Malbec",
      comment: "Fruta negra",
      vintage: 2019,
      createdAt: new Date("2026-11-01T10:00:00Z"),
      reviewer: {
        id: "u-2",
        username: "bruno",
        displayName: "Bruno Díaz",
        avatarUrl: "https://cdn.vinnot.com/bruno.jpg",
        tier: "RESERVA",
      },
      wine: { id: "w-1", name: "Catena", imageUrl: "https://cdn/w.jpg", type: "red", wineryName: "Catena Zapata" },
    });
    expect(
      mapUserReview({
        reviewId: "r-2",
        rating: 3,
        createdAt: "2026-11-01T10:00:00Z",
        reviewer: { id: "u-5", username: "eli" },
        wine: { id: "w-2", name: "Blanco" },
      }),
    ).toMatchObject({
      title: null,
      comment: null,
      vintage: null,
      wine: { imageUrl: null, type: null, wineryName: null },
    });
  });

  it("maps a public cellar wine without private fields", () => {
    expect(
      mapPublicCellarWine({
        id: "c-1",
        wine: { id: "w-1", name: "Catena", type: "WHITE" },
        vintage: 2020,
        rating: 5,
        addedAt: "2026-10-01T00:00:00Z",
        notes: "secret",
        purchasePrice: 9000,
      } as never),
    ).toEqual({
      id: "c-1",
      wine: { id: "w-1", name: "Catena", imageUrl: null, type: "white", wineryName: null },
      vintage: 2020,
      rating: 5,
      addedAt: new Date("2026-10-01T00:00:00Z"),
    });
    expect(
      mapPublicCellarWine({ id: "c-2", wine: { id: "w-2", name: "X" }, addedAt: "2026-10-01T00:00:00Z" }),
    ).toMatchObject({ vintage: null, rating: null });
  });

  it("maps the backend page wrapper", () => {
    expect(
      mapSocialPage(
        { items: [1], content: [1], pageNumber: 1, pageSize: 1, totalItems: 3, totalPages: 3, hasNext: true },
        (n: number) => n,
      ),
    ).toEqual({ items: [1], page: 1, totalItems: 3, totalPages: 3, hasMore: true });
    expect(mapSocialPage({ items: [], pageNumber: 2, totalItems: 3, totalPages: 3, hasNext: false }, (n: number) => n))
      .toMatchObject({ hasMore: false });
  });

  it("maps a page result and knows when more pages remain", () => {
    expect(
      mapSocialPage({ content: [1, 2], page: 0, size: 2, totalElements: 5, totalPages: 3 }, (n: number) => n * 10),
    ).toEqual({ items: [10, 20], page: 0, totalItems: 5, totalPages: 3, hasMore: true });
    expect(mapSocialPage({ content: [1], page: 2, totalElements: 5, totalPages: 3 }, (n: number) => n)).toMatchObject({
      hasMore: false,
    });
    expect(mapSocialPage({}, (n: number) => n)).toEqual({
      items: [],
      page: 0,
      totalItems: 0,
      totalPages: 0,
      hasMore: false,
    });
  });
});
