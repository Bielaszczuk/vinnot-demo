import { describe, expect, it } from "@jest/globals";
import {
  mapAiWineProfile,
  mapPaginated,
  mapReviewsPage,
  mapWine,
  mapWineComparison,
  mapWineReview,
  mapWineReviewComment,
  mapWineScanResult,
  mapWinesPage,
} from "./wine.mappers";

const minimalReview = {
  id: "review-2", wineId: "wine-1", userId: "user-1", username: "ana", rating: 4,
  createdAt: "2026-01-15T10:20:30.000Z",
};

describe("wine.mappers", () => {
  it("maps paginated wines payload to domain pagination shape", () => {
    const mapped = mapWinesPage({
      items: [
        {
          id: "w1",
          name: "Malbec Reserva",
          wineryName: "Bodega Norte",
          wineType: "red",
          region: "Mendoza",
          country: "Argentina",
          grapes: ["Malbec"],
          vintage: 2022,
          priceMin: 12000,
          ratingAverage: 4.3,
          ratingCount: 12,
          imageUrl: null,
          isNatural: false,
          bottleImageUrl: null,
          seoName: "malbec-reserva",
        },
      ],
      pageNumber: 0,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
      first: true,
      last: true,
    });

    expect(mapped.items).toHaveLength(1);
    expect(mapped.items[0]?.name).toBe("Malbec Reserva");
    expect(mapped.total).toBe(1);
    expect(mapped.page).toBe(0);
    expect(mapped.hasNext).toBe(false);
  });

  it("maps the AI color tones and drops unknown ones", () => {
    const mapped = mapAiWineProfile({
      wineId: "w1",
      generatedAt: "2026-01-15T10:20:30.000Z",
      visualColorTone: "RED_GARNET",
      visualRimTone: "RED_TAWNY",
      visualColorIntensity: "DEEP",
      profileContent: {},
    });
    expect(mapped.visualColorTone).toBe("RED_GARNET");
    expect(mapped.visualColorIntensity).toBe("DEEP");
    expect(mapped.visualRimTone).toBe("RED_TAWNY");
    expect(mapped.visualHighlights).toBe(false);
    expect(mapAiWineProfile({
      wineId: "w3",
      generatedAt: "2026-01-15T10:20:30.000Z",
      visualColorTone: "RED_RUBY_DEEP",
      visualHighlights: true,
      profileContent: {},
    }).visualHighlights).toBe(true);
    expect(mapAiWineProfile({
      wineId: "w4",
      generatedAt: "2026-01-15T10:20:30.000Z",
      visualReflectionTones: ["RED_PURPLE", "BLUE", "RED_TAWNY"],
      profileContent: {},
    }).visualReflectionTones).toEqual(["RED_PURPLE", "RED_TAWNY"]);

    const unknown = mapAiWineProfile({
      wineId: "w2",
      generatedAt: "2026-01-15T10:20:30.000Z",
      visualColorTone: "BLUE",
      visualRimTone: null,
      profileContent: {},
    });
    expect(unknown.visualColorTone).toBeNull();
    expect(unknown.visualRimTone).toBeNull();
    expect(unknown.visualColorIntensity).toBeNull();
    expect(mapAiWineProfile({
      wineId: "w5",
      generatedAt: "2026-01-15T10:20:30.000Z",
      visualColorIntensity: "VERY_DEEP",
      profileContent: {},
    }).visualColorIntensity).toBeNull();
  });

  it("maps AI profile payload and preserves generated fields", () => {
    const mapped = mapAiWineProfile({
      wineId: "w1",
      generatedAt: "2026-01-15T10:20:30.000Z",
      cached: true,
      profileContent: {
        summary: "Perfil aromático intenso",
        visualAnalysis: {
          color: "Ruby",
          clarity: "Brilliant",
          intensity: "High",
          viscosity: "Medium",
        },
        foodPairings: {
          pairings: ["Asado", "Queso azul"],
          explanation: "Alta intensidad y estructura.",
        },
      },
    });

    expect(mapped.wineId).toBe("w1");
    expect(mapped.summary).toContain("Perfil aromático");
    expect(mapped.visualAnalysis?.color).toBe("Ruby");
    expect(mapped.foodPairings?.pairings).toEqual(["Asado", "Queso azul"]);
    expect(mapped.fromCache).toBe(true);
    expect(mapped.generatedAt.toISOString()).toBe("2026-01-15T10:20:30.000Z");
  });

  it("maps scored scan candidates and the machine-readable outcome", () => {
    const wine = {
      id: "wine-1",
      name: "Malbec Reserva",
      wineryName: "Bodega Norte",
      wineType: "red" as const,
    };
    const mapped = mapWineScanResult({
      outcome: "POSSIBLE_MATCHES",
      confidence: 0.78,
      suggestions: [wine],
      candidates: [{ wine, score: 0.78 }],
      extractedData: {
        wineName: "Malbec Reserva",
        wineryName: "Bodega Norte",
        confidence: 0.92,
      },
    });

    expect(mapped.outcome).toBe("POSSIBLE_MATCHES");
    expect(mapped.candidates[0]?.score).toBe(0.78);
    expect(mapped.candidates[0]?.wine.name).toBe("Malbec Reserva");
    expect(mapped.extractedData?.confidence).toBe(0.92);
  });

  it("maps the recorded scan id and treats a missing one as not recorded", () => {
    expect(mapWineScanResult({ confidence: 0.4, scanId: "scan-1" }).scanId).toBe("scan-1");
    expect(mapWineScanResult({ confidence: 0.4, scanId: null }).scanId).toBeNull();
    expect(mapWineScanResult({ confidence: 0.4 }).scanId).toBeNull();
  });

  it("maps review identity, counters and comments with safe defaults", () => {
    const review = mapWineReview({
      id: "review-1",
      wineId: "wine-1",
      userId: "legacy-user",
      username: "legacy-name",
      rating: 5,
      helpfulCount: 3,
      reviewer: {
        id: "user-1",
        username: "ana",
        displayName: "Ana Pérez",
      },
      createdAt: "2026-01-15T10:20:30.000Z",
    });

    expect(review).toMatchObject({
      userId: "user-1",
      userName: "Ana Pérez",
      likesCount: 3,
      commentsCount: 0,
      likedByCurrentUser: false,
    });
    expect(review.updatedAt).toEqual(review.createdAt);
    expect(review.vintage).toBeNull();
    expect(mapWineReview({ ...minimalReview, vintage: 2018 }).vintage).toBe(2018);

    expect(mapWineReviewComment({
      id: "comment-1",
      reviewId: "review-1",
      content: "Excelente",
      createdAt: "2026-01-15T10:20:30.000Z",
      updatedAt: "2026-01-15T10:21:30.000Z",
    }).reviewer).toBeNull();
  });

  it("keeps the reviewer's badge tier and the rating's decimal", () => {
    const review = mapWineReview({
      ...minimalReview,
      rating: 3.6,
      reviewer: { id: "user-1", username: "ana", displayName: "Ana", badgeTier: "RESERVA" },
    });
    expect(review.rating).toBe(3.6);
    expect(review.reviewer?.badgeTier).toBe("RESERVA");
    expect(mapWineReview({ ...minimalReview, reviewer: { id: "u", username: "u", displayName: "U" } }).reviewer?.badgeTier)
      .toBeNull();
    expect(mapWineReviewComment({
      id: "comment-2",
      reviewId: "review-1",
      content: "Gran vino",
      createdAt: "2026-01-15T10:20:30.000Z",
      updatedAt: "2026-01-15T10:21:30.000Z",
      reviewer: { id: "user-2", username: "leo", displayName: "Leo", avatarUrl: null, badgeTier: "LOCKED" },
    }).reviewer?.badgeTier).toBeNull();
  });

  it("maps nested comparison payloads and dynamic wine keys", () => {
    const mapped = mapWineComparison({
      cached: true,
      comparisonContent: {
        summary: "Dos estilos distintos",
        similarities: ["Malbec"],
        differences: ["Cuerpo"],
        bestFor: {
          Reserva: ["Asado"],
          Joven: ["Picada"],
        },
      },
    });

    expect(mapped).toMatchObject({
      aiSummary: "Dos estilos distintos",
      keyDifferences: ["Cuerpo"],
      bestFor: { wineA: ["Asado"], wineB: ["Picada"] },
      fromCache: true,
    });
  });

  it("maps canonical best-for keys and complete wine details", () => {
    expect(mapWineComparison({
      cached: false,
      bestFor: { wineA: ["Cena"], wineB: ["Picada"] },
    }).bestFor).toEqual({ wineA: ["Cena"], wineB: ["Picada"] });
    expect(mapWine({
      id: "wine-2",
      name: "Reserva",
      wineType: "unknown",
      descriptionEn: "English",
    })).toMatchObject({ id: "wine-2", type: "red", description: "English" });
  });

  it("normalizes review and generic pagination aliases", () => {
    const review = {
      id: "review-1",
      wineId: "wine-1",
      userId: "user-1",
      username: "ana",
      rating: 4,
      createdAt: "2026-01-15T10:20:30.000Z",
    };
    const reviews = mapReviewsPage({
      content: [review],
      totalElements: 12,
      number: 2,
      size: 5,
      hasNext: true,
    });
    const generic = mapPaginated(
      { content: [{ value: "wine" }], totalElements: 1, number: 0, size: 10 },
      (item) => item.value.toUpperCase(),
    );

    expect(reviews).toMatchObject({ total: 12, page: 2, size: 5, hasNext: true });
    expect(reviews.items[0]?.id).toBe("review-1");
    expect(generic.items).toEqual(["WINE"]);
    expect(generic).toMatchObject({ total: 1, page: 0, isFirst: true, isLast: true });
  });
});
