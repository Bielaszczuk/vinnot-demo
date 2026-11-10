/**
 * Wines Service.
 * @architecture: Capa 3 — Aplicación
 */
import { winesClient } from "@/infrastructure/api/clients/wines.client";
import {
  mapAiWineProfile,
  mapReviewsPage,
  mapWine,
  mapWineComparison,
  mapWineReview,
  mapWineReviewComment,
  mapWineScanResult,
  mapWineSummary,
  mapWinesPage,
} from "@/domain/wine/wine.mappers";
import { vintageUpdateFields } from "@/domain/wine/vintage";
import type {
  AiProfileStatus,
  AiWineProfile,
  PaginatedResult,
  Wine,
  WineComparison,
  WineFilter,
  WineLabelScanInput,
  WineLabelImageAttachmentInput,
  WineLabelImageAttachmentResult,
  WineReview,
  WineReviewComment,
  WineReviewDraftInput,
  WineScanResult,
  WineSubmissionInput,
  WineSubmission,
  WineSubmissionResult,
  WineSummary,
} from "@/domain/wine/wine.types";
import type { AiProfileStatusDto, WineFilterDto } from "@/infrastructure/api/dto/wines.dto";

export const winesService = {
  async getWines(
    filter?: WineFilter,
    page = 0,
    pageSize = 20,
  ): Promise<PaginatedResult<WineSummary>> {
    const dto = await winesClient.getWines(mapFilterToParams(filter, page, pageSize));
    return mapWinesPage(dto);
  },

  async getHighlights(limit = 4): Promise<WineSummary[]> {
    const dtos = await winesClient.getHighlights(limit);
    return dtos.map(mapWineSummary);
  },

  async getWine(id: string): Promise<Wine> {
    const dto = await winesClient.getWine(id);
    return mapWine(dto);
  },

  async getWineReviews(
    id: string,
    params?: { page?: number; pageSize?: number; filter?: "recent" | "popular" | "mine" },
  ): Promise<PaginatedResult<WineReview>> {
    const dto = await winesClient.getWineReviews(id, params);
    return mapReviewsPage(dto);
  },

  async createReview(wineId: string, input: WineReviewDraftInput): Promise<WineReview> {
    const { rating, title, comment, vintage } = input;
    const dto = await winesClient.createWineReview(wineId, {
      rating, title, comment, ...(vintage != null ? { vintage } : {}),
    });
    return mapWineReview(dto);
  },

  async updateReview(wineId: string, reviewId: string, input: WineReviewDraftInput): Promise<WineReview> {
    const { rating, title, comment, vintage } = input;
    const dto = await winesClient.updateWineReview(wineId, reviewId, {
      rating, title, comment, ...vintageUpdateFields(vintage),
    });
    return mapWineReview(dto);
  },

  async deleteReview(wineId: string, reviewId: string): Promise<void> {
    await winesClient.deleteWineReview(wineId, reviewId);
  },

  async markReviewHelpful(wineId: string, reviewId: string): Promise<void> {
    await winesClient.markReviewHelpful(wineId, reviewId);
  },

  async unmarkReviewHelpful(wineId: string, reviewId: string): Promise<void> {
    await winesClient.unmarkReviewHelpful(wineId, reviewId);
  },

  async getMyReviewStatus(wineId: string): Promise<{ hasReview: boolean }> {
    return winesClient.getMyReviewStatus(wineId);
  },

  async getReviewComments(wineId: string, reviewId: string): Promise<WineReviewComment[]> {
    const dtos = await winesClient.getReviewComments(wineId, reviewId);
    return dtos.map(mapWineReviewComment);
  },

  async addReviewComment(
    wineId: string,
    reviewId: string,
    content: string,
  ): Promise<WineReviewComment> {
    const dto = await winesClient.addReviewComment(wineId, reviewId, content);
    return mapWineReviewComment(dto);
  },

  async deleteReviewComment(wineId: string, reviewId: string, commentId: string): Promise<void> {
    await winesClient.deleteReviewComment(wineId, reviewId, commentId);
  },

  async getSimilarWines(wineId: string, limit = 5): Promise<WineSummary[]> {
    const dtos = await winesClient.getSimilarWines(wineId, limit);
    return dtos.map(mapWineSummary);
  },

  async getRecommendedWines(limit = 10): Promise<WineSummary[]> {
    const dtos = await winesClient.getRecommendedWines(limit);
    return dtos.map(mapWineSummary);
  },

  async getPopularWines(limit = 10): Promise<WineSummary[]> {
    const dtos = await winesClient.getPopularWines(limit);
    return dtos.map(mapWineSummary);
  },

  async getAiProfile(id: string, language = "es"): Promise<AiWineProfile> {
    const dto = await winesClient.getAiProfile(id, language);
    return mapAiWineProfile(dto);
  },

  async getAiProfileStatus(id: string, language = "es"): Promise<AiProfileStatus> {
    const dto = await winesClient.getAiProfileStatus(id, language);
    return mapAiProfileStatus(dto);
  },

  async generateAiProfile(id: string, language = "es"): Promise<AiWineProfile> {
    const dto = await winesClient.generateAiProfile(id, language);
    return mapAiWineProfile(dto);
  },

  async regenerateAiProfile(id: string, language = "es"): Promise<AiWineProfile> {
    const dto = await winesClient.regenerateAiProfile(id, language);
    return mapAiWineProfile(dto);
  },

  async compareWines(
    wineAId: string,
    wineBId: string,
    language = "es-AR",
  ): Promise<WineComparison> {
    const dto = await winesClient.compareWines(wineAId, wineBId, language);
    return mapWineComparison(dto);
  },

  async scanLabel(input: WineLabelScanInput, signal?: AbortSignal): Promise<WineScanResult> {
    const dto = await winesClient.scanLabel(input.imageUri, input.observedText, signal);
    return mapWineScanResult(dto);
  },

  async submitWine(input: WineSubmissionInput): Promise<WineSubmissionResult> {
    const dto = await winesClient.submitWine(input);
    return {
      submissionId: dto.submissionId,
      status: dto.status,
      message: dto.message,
      wine: dto.wine ? mapWineSummary(dto.wine) : null,
    };
  },

  async getMySubmissions(page = 0, pageSize = 20): Promise<PaginatedResult<WineSubmission>> {
    const dto = await winesClient.getMySubmissions(page, pageSize);
    const items = dto.items ?? dto.content ?? [];
    return {
      items: items.map((submission) => ({
        id: submission.id,
        wineName: submission.wineName,
        wineryName: submission.wineryName,
        wineType: submission.wineType ?? null,
        vintage: submission.vintage ?? null,
        grapes: submission.grapes ?? [],
        country: submission.country ?? null,
        region: submission.region ?? null,
        alcoholContent: submission.alcoholContent ?? null,
        notes: submission.notes ?? null,
        imageUrl: submission.imageUrl ?? null,
        imageAvailable: submission.imageAvailable,
        status: submission.status,
        reviewReason: submission.reviewReason ?? null,
        reasonCode: submission.reasonCode ?? null,
        matchedWineId: submission.matchedWineId ?? null,
        createdWineId: submission.createdWineId ?? null,
        reviewedAt: submission.reviewedAt ? new Date(submission.reviewedAt) : null,
        createdAt: new Date(submission.createdAt),
        updatedAt: new Date(submission.updatedAt),
      })),
      total: dto.totalItems ?? dto.totalElements ?? items.length,
      totalPages: dto.totalPages ?? 1,
      page: dto.pageNumber ?? dto.number ?? page,
      size: dto.pageSize ?? dto.size ?? pageSize,
      isFirst: dto.first ?? page === 0,
      isLast: dto.last ?? true,
      hasNext: dto.hasNext ?? false,
      hasPrevious: dto.hasPrevious ?? page > 0,
    };
  },

  async attachLabelImage(
    input: WineLabelImageAttachmentInput,
  ): Promise<WineLabelImageAttachmentResult> {
    const dto = await winesClient.attachLabelImage(
      input.wineId,
      input.imageUri,
      input.observedText,
    );
    return {
      wineId: dto.wineId,
      imageUrl: dto.imageUrl ?? null,
      attached: dto.attached,
    };
  },

  async searchByText(search: string): Promise<PaginatedResult<WineSummary>> {
    const dto = await winesClient.searchByText(search);
    return mapWinesPage(dto);
  },

  async addToFavorites(wineId: string): Promise<void> {
    await winesClient.addToFavorites(wineId);
  },

  async removeFromFavorites(wineId: string): Promise<void> {
    await winesClient.removeFromFavorites(wineId);
  },
};

function mapAiProfileStatus(dto: AiProfileStatusDto): AiProfileStatus {
  return {
    status: dto.status,
    generatedAt: dto.generatedAt ?? null,
  };
}

function mapFilterToParams(
  filter: WineFilter | undefined,
  page: number,
  pageSize: number,
): WineFilterDto {
  const sortByMap: Record<string, WineFilterDto["sortBy"]> = {
    name: "name",
    price: "priceMin",
    rating: "ratingAverage",
    vintage: "vintage",
    createdAt: undefined,
  };

  return {
    page,
    size: pageSize,
    search: filter?.search,
    type: filter?.type,
    country: filter?.country,
    region: filter?.region,
    grapeVariety: filter?.grapeVariety,
    wineryId: filter?.wineryId,
    minPrice: filter?.minPrice,
    maxPrice: filter?.maxPrice,
    minRating: filter?.minRating,
    vintage: filter?.vintage,
    sortBy: filter?.sortBy ? sortByMap[filter.sortBy] : undefined,
    sortDirection: filter?.sortOrder?.toUpperCase() as WineFilterDto["sortDirection"],
  };
}
