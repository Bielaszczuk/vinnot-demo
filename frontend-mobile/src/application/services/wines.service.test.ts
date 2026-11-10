import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { winesService } from "./wines.service";
import { winesClient } from "@/infrastructure/api/clients/wines.client";
import { mapWineComparison, mapWineSummary, mapWinesPage } from "@/domain/wine/wine.mappers";
import type {
  CompareResultDto,
  WineSummaryDto,
  WinesPageResponseDto,
} from "@/infrastructure/api/dto/wines.dto";

jest.mock("@/infrastructure/api/clients/wines.client", () => ({
  winesClient: {
    getWines: jest.fn(),
    getHighlights: jest.fn(),
    getWine: jest.fn(),
    getWineReviews: jest.fn(),
    createWineReview: jest.fn(),
    updateWineReview: jest.fn(),
    deleteWineReview: jest.fn(),
    markReviewHelpful: jest.fn(),
    unmarkReviewHelpful: jest.fn(),
    getMyReviewStatus: jest.fn(),
    getReviewComments: jest.fn(),
    addReviewComment: jest.fn(),
    deleteReviewComment: jest.fn(),
    getSimilarWines: jest.fn(),
    getRecommendedWines: jest.fn(),
    getPopularWines: jest.fn(),
    getAiProfile: jest.fn(),
    getAiProfileStatus: jest.fn(),
    generateAiProfile: jest.fn(),
    regenerateAiProfile: jest.fn(),
    compareWines: jest.fn(),
    scanLabel: jest.fn(),
    submitWine: jest.fn(),
    getMySubmissions: jest.fn(),
    attachLabelImage: jest.fn(),
    searchByText: jest.fn(),
    addToFavorites: jest.fn(),
    removeFromFavorites: jest.fn(),
  },
}));

jest.mock("@/domain/wine/wine.mappers", () => ({
  mapAiWineProfile: jest.fn(),
  mapReviewsPage: jest.fn(),
  mapWine: jest.fn(),
  mapWineComparison: jest.fn(),
  mapWineReview: jest.fn(),
  mapWineReviewComment: jest.fn(),
  mapWineScanResult: jest.fn(),
  mapWineSummary: jest.fn(),
  mapWinesPage: jest.fn(),
}));

const winesClientMock = winesClient as jest.Mocked<typeof winesClient>;
const mapWinesPageMock = mapWinesPage as jest.MockedFunction<typeof mapWinesPage>;
const mapWineComparisonMock = mapWineComparison as jest.MockedFunction<typeof mapWineComparison>;

describe("wines.service", () => {
  it("passes scan cancellation through to the HTTP adapter", async () => {
    const controller = new AbortController();
    await winesService.scanLabel(
      { imageUri: "file:///capture.jpg", observedText: [] },
      controller.signal,
    );
    expect(winesClientMock.scanLabel).toHaveBeenCalledWith(
      "file:///capture.jpg",
      [],
      controller.signal,
    );
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("forwards filter params to client and maps paginated wines", async () => {
    const pageDto: WinesPageResponseDto = {
      items: [{ id: "wine-1", name: "Malbec Reserva", wineType: "red" }],
      pageNumber: 1,
      pageSize: 30,
      totalItems: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
      first: true,
      last: true,
    };
    winesClientMock.getWines.mockResolvedValue(pageDto);
    mapWinesPageMock.mockReturnValue({
      items: [
        {
          id: "wine-1",
          name: "Malbec Reserva",
          winery: "Bodega Test",
          region: "Mendoza",
          country: "Argentina",
          type: "red",
          imageUrl: null,
          rating: 4.5,
          reviewCount: 12,
          vintage: 2023,
          price: null,
          grapeVarieties: [],
          isNatural: false,
          bottleImageUrl: null,
          seoName: null,
        },
      ],
      page: 1,
      size: 30,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
      isFirst: true,
      isLast: true,
    });

    const result = await winesService.getWines(
      { search: "malbec", country: "Argentina", sortBy: "rating", sortOrder: "desc" },
      1,
      30,
    );

    expect(winesClientMock.getWines).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        size: 30,
        search: "malbec",
        country: "Argentina",
        sortBy: "ratingAverage",
        sortDirection: "DESC",
      }),
    );
    expect(mapWinesPageMock).toHaveBeenCalledWith(pageDto);
    expect(result.items).toHaveLength(1);
  });

  it("compares wines through client and maps comparison output", async () => {
    const comparisonDto: CompareResultDto = {
      wineAId: "wine-a",
      wineBId: "wine-b",
      wineAName: "A",
      wineBName: "B",
      language: "es-AR",
      comparisonContent: {},
      cached: false,
      generatedAt: "2026-05-30T10:00:00.000Z",
    };
    winesClientMock.compareWines.mockResolvedValue(comparisonDto);
    mapWineComparisonMock.mockReturnValue({
      wines: [],
      attributes: [],
      aiSummary: null,
      summary: "A y B",
      recommendation: undefined,
      recommendationWineA: undefined,
      recommendationWineB: undefined,
      similarities: [],
      differences: [],
      keyDifferences: [],
      attributeComparison: { attributes: [] },
      bestFor: { wineA: [], wineB: [] },
      fromCache: false,
    });

    const result = await winesService.compareWines("wine-a", "wine-b", "es-AR");

    expect(winesClientMock.compareWines).toHaveBeenCalledWith("wine-a", "wine-b", "es-AR");
    expect(mapWineComparisonMock).toHaveBeenCalledWith(comparisonDto);
    expect(result.summary).toBe("A y B");
  });

  it("maps the current user's submissions and pagination aliases", async () => {
    winesClientMock.getMySubmissions.mockResolvedValue({
      content: [
        {
          id: "submission-1",
          wineName: "Reserva",
          wineryName: "Bodega Norte",
          grapes: null,
          imageAvailable: true,
          status: "NEEDS_REVIEW",
          reviewReason: "Content moderation was unavailable",
          reasonCode: "MODERATION_UNAVAILABLE",
          reviewedAt: "2026-05-31T10:00:00.000Z",
          createdAt: "2026-05-30T10:00:00.000Z",
          updatedAt: "2026-05-31T10:00:00.000Z",
        },
      ],
      totalElements: 21,
      totalPages: 2,
      number: 1,
      size: 20,
      hasNext: false,
      hasPrevious: true,
    });

    const result = await winesService.getMySubmissions(1, 20);

    expect(winesClientMock.getMySubmissions).toHaveBeenCalledWith(1, 20);
    expect(result).toMatchObject({ total: 21, page: 1, size: 20, hasPrevious: true });
    expect(result.items[0]).toMatchObject({
      id: "submission-1",
      grapes: [],
      status: "NEEDS_REVIEW",
      reasonCode: "MODERATION_UNAVAILABLE",
    });
    expect(result.items[0]?.reviewedAt?.toISOString()).toBe("2026-05-31T10:00:00.000Z");
  });

  it("maps an attached label response without leaking transport nullability", async () => {
    winesClientMock.attachLabelImage.mockResolvedValue({
      wineId: "wine-1",
      attached: false,
    });

    const result = await winesService.attachLabelImage({
      wineId: "wine-1",
      imageUri: "file:///label.jpg",
      observedText: ["Reserva", "Malbec"],
    });

    expect(winesClientMock.attachLabelImage).toHaveBeenCalledWith("wine-1", "file:///label.jpg", [
      "Reserva",
      "Malbec",
    ]);
    expect(result).toEqual({ wineId: "wine-1", imageUrl: null, attached: false });
  });

  it("orchestrates catalog, review, recommendation and AI use cases", async () => {
    const dto = { id: "wine-1" } as never;
    winesClientMock.getWine.mockResolvedValue(dto);
    winesClientMock.getWineReviews.mockResolvedValue(dto);
    winesClientMock.createWineReview.mockResolvedValue(dto);
    winesClientMock.updateWineReview.mockResolvedValue(dto);
    winesClientMock.getMyReviewStatus.mockResolvedValue({ hasReview: true });
    winesClientMock.getReviewComments.mockResolvedValue([dto]);
    winesClientMock.addReviewComment.mockResolvedValue(dto);
    winesClientMock.getSimilarWines.mockResolvedValue([dto]);
    winesClientMock.getRecommendedWines.mockResolvedValue([dto]);
    winesClientMock.getPopularWines.mockResolvedValue([dto]);
    winesClientMock.getAiProfile.mockResolvedValue(dto);
    winesClientMock.getAiProfileStatus.mockResolvedValue({
      status: "READY",
      generatedAt: "2026-08-13T10:00:00.000Z",
    });
    winesClientMock.generateAiProfile.mockResolvedValue(dto);
    winesClientMock.regenerateAiProfile.mockResolvedValue(dto);
    winesClientMock.scanLabel.mockResolvedValue(dto);
    winesClientMock.searchByText.mockResolvedValue(dto);

    await winesService.getWine("wine-1");
    await winesService.getWineReviews("wine-1", { page: 1, filter: "popular" });
    await winesService.createReview("wine-1", { rating: 5, title: "Excelente", comment: "Comentario" });
    await winesService.updateReview("wine-1", "review-1", { rating: 4, title: "Muy bueno", comment: "Texto" });
    await winesService.deleteReview("wine-1", "review-1");
    await winesService.markReviewHelpful("wine-1", "review-1");
    await winesService.unmarkReviewHelpful("wine-1", "review-1");
    await expect(winesService.getMyReviewStatus("wine-1")).resolves.toEqual({ hasReview: true });
    await winesService.getReviewComments("wine-1", "review-1");
    await winesService.addReviewComment("wine-1", "review-1", "Gracias");
    await winesService.deleteReviewComment("wine-1", "review-1", "comment-1");
    await winesService.getSimilarWines("wine-1");
    await winesService.getRecommendedWines();
    await winesService.getPopularWines();
    await winesService.getAiProfile("wine-1");
    await expect(winesService.getAiProfileStatus("wine-1")).resolves.toEqual({
      status: "READY",
      generatedAt: "2026-08-13T10:00:00.000Z",
    });
    await winesService.generateAiProfile("wine-1");
    await winesService.regenerateAiProfile("wine-1");
    await winesService.scanLabel({ imageUri: "file:///label.jpg", observedText: ["Malbec"] });
    await winesService.searchByText("malbec");
    await winesService.addToFavorites("wine-1");
    await winesService.removeFromFavorites("wine-1");

    expect(winesClientMock.generateAiProfile).toHaveBeenCalledWith("wine-1", "es");
    expect(winesClientMock.regenerateAiProfile).toHaveBeenCalledWith("wine-1", "es");
    expect(winesClientMock.scanLabel).toHaveBeenCalledWith(
      "file:///label.jpg",
      ["Malbec"],
      undefined,
    );
    expect(winesClientMock.createWineReview).toHaveBeenCalledWith("wine-1", {
      rating: 5, title: "Excelente", comment: "Comentario",
    });
    expect(winesClientMock.updateWineReview).toHaveBeenCalledWith("wine-1", "review-1", {
      rating: 4, title: "Muy bueno", comment: "Texto",
    });
    expect(winesClientMock.deleteWineReview).toHaveBeenCalled();
    expect(winesClientMock.addToFavorites).toHaveBeenCalledWith("wine-1");
  });

  it("maps automatic and review submission results", async () => {
    winesClientMock.submitWine.mockResolvedValueOnce({
      submissionId: "submission-1",
      status: "APPROVED",
      message: "Publicado",
      wine: { id: "wine-1" } as never,
    });
    winesClientMock.submitWine.mockResolvedValueOnce({
      submissionId: "submission-2",
      status: "NEEDS_REVIEW",
      message: "En revisión",
      wine: null,
    });

    await expect(
      winesService.submitWine({
        wineName: "Reserva",
        wineryName: "Bodega",
        imageUri: "file://label",
      }),
    ).resolves.toMatchObject({ submissionId: "submission-1", status: "APPROVED" });
    await expect(
      winesService.submitWine({
        wineName: "Reserva",
        wineryName: "Bodega",
        imageUri: "file://label",
      }),
    ).resolves.toMatchObject({ submissionId: "submission-2", wine: null });
  });

  it("uses defaults when submission pagination aliases are absent", async () => {
    winesClientMock.getMySubmissions.mockResolvedValue({
      items: [
        {
          id: "submission-1",
          wineName: "Reserva",
          wineryName: "Bodega",
          grapes: ["Malbec"],
          imageAvailable: false,
          status: "APPROVED",
          createdAt: "2026-08-13T10:00:00.000Z",
          updatedAt: "2026-08-13T10:00:00.000Z",
        },
      ],
    });

    const result = await winesService.getMySubmissions();

    expect(result).toMatchObject({ total: 1, totalPages: 1, page: 0, size: 20 });
    expect(result.items[0]).toMatchObject({ reviewedAt: null, grapes: ["Malbec"] });
  });

  it("maps all supported sort fields without leaking UI-only createdAt", async () => {
    const emptyPage = {} as WinesPageResponseDto;
    winesClientMock.getWines.mockResolvedValue(emptyPage);
    mapWinesPageMock.mockReturnValue({} as never);

    for (const sortBy of ["name", "price", "vintage", "createdAt"] as const) {
      await winesService.getWines({ sortBy, sortOrder: "asc" });
    }

    expect(winesClientMock.getWines).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortBy: undefined, sortDirection: "ASC" }),
    );
  });
});

it("maps a bounded highlights collection without reordering it", async () => {
  const dtos: WineSummaryDto[] = [
    { id: "first", name: "First", wineType: "RED" },
    { id: "second", name: "Second", wineType: "WHITE" },
  ];
  winesClientMock.getHighlights.mockResolvedValue(dtos);
  const first = { id: "first", name: "First" } as never;
  const second = { id: "second", name: "Second" } as never;
  jest.mocked(mapWineSummary).mockReturnValueOnce(first).mockReturnValueOnce(second);
  await expect(winesService.getHighlights()).resolves.toEqual([first, second]);
  // Array.map passes index and array too; the mapper is typed with its single parameter.
  expect(jest.mocked(mapWineSummary).mock.calls).toContainEqual([dtos[0], 0, dtos]);
  expect(jest.mocked(mapWineSummary).mock.calls).toContainEqual([dtos[1], 1, dtos]);
  expect(winesClientMock.getHighlights).toHaveBeenLastCalledWith(4);
  await winesService.getHighlights(6);
  expect(winesClientMock.getHighlights).toHaveBeenLastCalledWith(6);
});

describe("review vintage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    winesClientMock.createWineReview.mockResolvedValue({ id: "review-1" } as never);
    winesClientMock.updateWineReview.mockResolvedValue({ id: "review-1" } as never);
  });

  it("sends the tasted vintage when creating a review", async () => {
    await winesService.createReview("wine-1", { rating: 4, vintage: 2018 });
    expect(winesClientMock.createWineReview).toHaveBeenCalledWith("wine-1", {
      rating: 4, title: undefined, comment: undefined, vintage: 2018,
    });
  });

  it("omits the vintage when creating a review without one", async () => {
    await winesService.createReview("wine-1", { rating: 4, vintage: null });
    expect(winesClientMock.createWineReview.mock.calls[0]?.[1]).not.toHaveProperty("vintage");
  });

  it("replaces, clears or keeps the vintage on update", async () => {
    await winesService.updateReview("wine-1", "review-1", { rating: 4, vintage: 2020 });
    await winesService.updateReview("wine-1", "review-1", { rating: 4, vintage: null });
    await winesService.updateReview("wine-1", "review-1", { rating: 4 });
    const bodies = winesClientMock.updateWineReview.mock.calls.map((call) => call[2]);
    expect(bodies[0]).toEqual({ rating: 4, title: undefined, comment: undefined, vintage: 2020 });
    expect(bodies[0]).not.toHaveProperty("clearVintage");
    expect(bodies[1]).toEqual({ rating: 4, title: undefined, comment: undefined, clearVintage: true });
    expect(bodies[1]).not.toHaveProperty("vintage");
    expect(bodies[2]).not.toHaveProperty("vintage");
    expect(bodies[2]).not.toHaveProperty("clearVintage");
  });
});
