import { winesClient } from "./wines.client";
import { http } from "@/infrastructure/api/http";

jest.mock("@/infrastructure/api/http", () => ({
  http: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock("@/shared/config/env", () => ({ env: { apiBaseUrl: "https://api.vinnot.com/api" } }));

const postMock = http.post as jest.MockedFunction<typeof http.post>;

describe("winesClient.compareWines", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses the AI-operation timeout instead of the default HTTP timeout", async () => {
    postMock.mockResolvedValue({ data: { summary: "comparison" } });

    await winesClient.compareWines("wine-a", "wine-b", "es-AR");

    expect(postMock).toHaveBeenCalledWith(
      "/wines/compare",
      { wineAId: "wine-a", wineBId: "wine-b", language: "es-AR" },
      { timeout: 120_000 },
    );
  });

  it("allows provider and network variance without an unbounded scan", async () => {
    postMock.mockResolvedValue({ data: { outcome: "NO_MATCH" } });

    await winesClient.scanLabel("file:///label.jpg", ["CATENA", "MALBEC"]);

    expect(postMock).toHaveBeenCalledWith("/wines/scan", expect.any(FormData), {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 22_000,
    });
  });

  it("passes the native scan cancellation signal to the HTTP transport", async () => {
    postMock.mockResolvedValue({ data: { outcome: "NO_MATCH" } });
    const controller = new AbortController();
    await winesClient.scanLabel("file:///label.jpg", [], controller.signal);
    expect(postMock).toHaveBeenCalledWith(
      "/wines/scan",
      expect.any(FormData),
      expect.objectContaining({ signal: controller.signal, timeout: 22_000 }),
    );
  });

  it("sends profile generation language without exposing force intent", async () => {
    postMock.mockResolvedValue({ data: { wineId: "wine-1", language: "en" } });

    await winesClient.generateAiProfile("wine-1", "en");

    expect(postMock).toHaveBeenCalledWith(
      "/wines/wine-1/ai-profile",
      { language: "en" },
      { timeout: 120_000 },
    );
  });

  it("uses the permission-protected endpoint for forced regeneration", async () => {
    postMock.mockResolvedValue({ data: { wineId: "wine-1", language: "en" } });

    await winesClient.regenerateAiProfile("wine-1", "en");

    expect(postMock).toHaveBeenCalledWith("/wines/wine-1/ai-profile/generate", undefined, {
      params: { language: "en" },
      timeout: 120_000,
    });
  });
});

it("resolves uploaded labels for detail and paged discovery without changing params or totals", async () => {
  const get = http.get as jest.Mock;
  const wine = {
    id: "wine-1",
    imageUrl: "/api/uploads/wine-labels/label.jpg",
    bottleImageUrl: null,
  };
  get.mockResolvedValueOnce({ data: wine });
  expect(await winesClient.getWine("wine-1")).toEqual({
    ...wine,
    imageUrl: "https://api.vinnot.com/api/uploads/wine-labels/label.jpg",
  });
  const page = { content: [wine], pageNumber: 2, pageSize: 20, totalItems: 73, hasNext: true };
  get.mockResolvedValueOnce({ data: page });
  expect(await winesClient.getWines({ page: 2, size: 20, country: "Argentina" })).toEqual({
    ...page,
    content: [{ ...wine, imageUrl: "https://api.vinnot.com/api/uploads/wine-labels/label.jpg" }],
  });
  expect(get).toHaveBeenLastCalledWith("/wines", {
    params: { page: 2, size: 20, country: "Argentina" },
  });
  expect(wine.imageUrl).toBe("/api/uploads/wine-labels/label.jpg");
});
it("resolves wine photos returned from scan, submission and attachment", async () => {
  const wine = { id: "wine-1", imageUrl: "/api/uploads/wine-labels/label.jpg" };
  const resolved = {
    ...wine,
    imageUrl: "https://api.vinnot.com/api/uploads/wine-labels/label.jpg",
  };
  postMock.mockResolvedValueOnce({
    data: { wine, suggestions: [wine], candidates: [{ wine, score: 0.9 }] },
  });
  expect(await winesClient.scanLabel("file:///label.jpg", [])).toEqual({
    wine: resolved,
    suggestions: [resolved],
    candidates: [{ wine: resolved, score: 0.9 }],
  });
  postMock.mockResolvedValueOnce({ data: { status: "APPROVED", wine } });
  expect(
    await winesClient.submitWine({
      imageUri: "file:///label.jpg",
      wineName: "Wine",
      wineryName: "Winery",
      alcoholContent: 13.6,
    }),
  ).toEqual({ status: "APPROVED", wine: resolved });
  postMock.mockResolvedValueOnce({
    data: { wineId: "wine-1", attached: true, imageUrl: wine.imageUrl },
  });
  expect(await winesClient.attachLabelImage("wine-1", "file:///label.jpg", [])).toEqual({
    wineId: "wine-1",
    attached: true,
    imageUrl: resolved.imageUrl,
  });
});

it("requests bounded home highlights and resolves asset URLs preserving server order", async () => {
  const get = http.get as jest.Mock;
  const data = [
    { id: "a", imageUrl: "/api/uploads/wine-labels/a.webp" },
    { id: "b", imageUrl: null },
  ];
  get.mockResolvedValue({ data });
  expect(await winesClient.getHighlights()).toEqual([
    { ...data[0], imageUrl: "https://api.vinnot.com/api/uploads/wine-labels/a.webp" },
    data[1],
  ]);
  expect(get).toHaveBeenLastCalledWith("/wines/highlights", { params: { limit: 4 } });
  await winesClient.getHighlights(6);
  expect(get).toHaveBeenLastCalledWith("/wines/highlights", { params: { limit: 6 } });
});

it("sends catalog picks next to their names and omits them when the value is a proposal", async () => {
  postMock.mockResolvedValue({ data: { status: "NEEDS_REVIEW", wine: null } });
  await winesClient.submitWine({
    imageUri: "file:///label.jpg",
    wineName: "Wine",
    wineryName: "Catena Zapata",
    wineryId: "winery-1",
    country: "Argentina",
    countryId: "country-1",
    region: "Mendoza",
    regionId: "region-1",
    grapes: ["Malbec", "Uva Nueva"],
  });
  const picked = postMock.mock.calls.at(-1)?.[1] as FormData;
  expect(picked.get("wineryId")).toBe("winery-1");
  expect(picked.get("countryId")).toBe("country-1");
  expect(picked.get("regionId")).toBe("region-1");
  expect(picked.get("country")).toBe("Argentina");
  expect(picked.getAll("grapes")).toEqual(["Malbec", "Uva Nueva"]);

  await winesClient.submitWine({ imageUri: "file:///label.jpg", wineName: "Wine", wineryName: "Bodega Nueva", country: "Narnia" });
  const proposed = postMock.mock.calls.at(-1)?.[1] as FormData;
  expect(proposed.get("country")).toBe("Narnia");
  expect(proposed.get("wineryId")).toBeNull();
  expect(proposed.get("countryId")).toBeNull();
  expect(proposed.get("regionId")).toBeNull();
});

it("sends a wine without a label photo when the person has none at hand", async () => {
  postMock.mockResolvedValue({ data: { status: "NEEDS_REVIEW", wine: null } });

  await winesClient.submitWine({ imageUri: null, wineName: "Wine", wineryName: "Bodega Nueva", wineType: "RED" });

  const sent = postMock.mock.calls.at(-1)?.[1] as FormData;
  expect(sent.get("image")).toBeNull();
  expect(sent.get("wineName")).toBe("Wine");
  expect(sent.get("wineType")).toBe("RED");
});

describe("winesClient review vintage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("posts the tasted vintage with a new review", async () => {
    postMock.mockResolvedValue({ data: { id: "review-1" } });

    await winesClient.createWineReview("wine-1", { rating: 4, vintage: 2018 });

    expect(postMock).toHaveBeenCalledWith("/wines/wine-1/reviews", { rating: 4, vintage: 2018 });
  });

  it("patches a cleared vintage with the clear flag", async () => {
    const patchMock = http.patch as jest.MockedFunction<typeof http.patch>;
    patchMock.mockResolvedValue({ data: { id: "review-1" } });

    await winesClient.updateWineReview("wine-1", "review-1", { rating: 4, clearVintage: true });

    expect(patchMock).toHaveBeenCalledWith("/wines/wine-1/reviews/review-1", { rating: 4, clearVintage: true });
  });
});
