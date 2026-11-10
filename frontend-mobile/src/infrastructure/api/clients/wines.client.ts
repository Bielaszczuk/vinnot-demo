/**
 * Wines API Client.
 * @architecture: Capa 4 — Infraestructura HTTP
 */
import {
  resolveWineAssetUrls,
  resolveWinePageAssetUrls,
} from "@/infrastructure/api/resolveApiAssetUrl";
import { http } from "@/infrastructure/api/http";
import { WINE_OPERATION_TIMEOUTS } from "@/shared/config/constants";
import type {
  AiWineProfileDto,
  AiProfileStatusDto,
  CompareResultDto,
  CreateWineReviewRequestDto,
  UpdateWineReviewRequestDto,
  PaginatedDto,
  ReviewCommentDto,
  ReviewsPageResponseDto,
  WineDetailsDto,
  WineFilterDto,
  WineReviewDto,
  WineScanResultDto,
  WineLabelImageAttachmentDto,
  WineSubmissionDetailsDto,
  WineSubmissionRequestDto,
  WineSubmissionResultDto,
  WineSummaryDto,
  WinesPageResponseDto,
} from "@/infrastructure/api/dto/wines.dto";

export const winesClient = {
  getWines: (params?: WineFilterDto): Promise<WinesPageResponseDto> =>
    http
      .get<WinesPageResponseDto>("/wines", { params })
      .then((r) => resolveWinePageAssetUrls(r.data)),

  getHighlights: (limit = 4): Promise<WineSummaryDto[]> =>
    http
      .get<WineSummaryDto[]>("/wines/highlights", { params: { limit } })
      .then(({ data }) => data.map(resolveWineAssetUrls)),

  getWine: (id: string): Promise<WineDetailsDto> =>
    http.get<WineDetailsDto>(`/wines/${id}`).then((r) => resolveWineAssetUrls(r.data)),

  getWineReviews: (
    id: string,
    params?: { page?: number; pageSize?: number; filter?: "recent" | "popular" | "mine" },
  ): Promise<ReviewsPageResponseDto> =>
    http
      .get<ReviewsPageResponseDto>(`/wines/${id}/reviews`, {
        params: { page: params?.page, size: params?.pageSize, filter: params?.filter },
      })
      .then((r) => r.data),

  createWineReview: (id: string, data: CreateWineReviewRequestDto): Promise<WineReviewDto> =>
    http.post<WineReviewDto>(`/wines/${id}/reviews`, data).then((r) => r.data),

  updateWineReview: (
    wineId: string,
    reviewId: string,
    data: UpdateWineReviewRequestDto,
  ): Promise<WineReviewDto> =>
    http.patch<WineReviewDto>(`/wines/${wineId}/reviews/${reviewId}`, data).then((r) => r.data),

  deleteWineReview: (wineId: string, reviewId: string): Promise<void> =>
    http.delete(`/wines/${wineId}/reviews/${reviewId}`).then(() => undefined),

  markReviewHelpful: (wineId: string, reviewId: string): Promise<boolean> =>
    http.post<boolean>(`/wines/${wineId}/reviews/${reviewId}/like`).then((r) => r.data),

  unmarkReviewHelpful: (wineId: string, reviewId: string): Promise<void> =>
    http.delete(`/wines/${wineId}/reviews/${reviewId}/like`).then(() => undefined),

  getMyReviewStatus: (wineId: string): Promise<{ hasReview: boolean }> =>
    http.get<{ hasReview: boolean }>(`/wines/${wineId}/reviews/mine`).then((r) => r.data),

  getReviewComments: (wineId: string, reviewId: string): Promise<ReviewCommentDto[]> =>
    http
      .get<ReviewCommentDto[]>(`/wines/${wineId}/reviews/${reviewId}/comments`)
      .then((r) => r.data),

  addReviewComment: (
    wineId: string,
    reviewId: string,
    content: string,
  ): Promise<ReviewCommentDto> =>
    http
      .post<ReviewCommentDto>(`/wines/${wineId}/reviews/${reviewId}/comments`, { content })
      .then((r) => r.data),

  deleteReviewComment: (wineId: string, reviewId: string, commentId: string): Promise<void> =>
    http.delete(`/wines/${wineId}/reviews/${reviewId}/comments/${commentId}`).then(() => undefined),

  getSimilarWines: (wineId: string, limit = 5): Promise<WineSummaryDto[]> =>
    http
      .get<WineSummaryDto[]>(`/wines/${wineId}/similar`, { params: { limit } })
      .then((r) => r.data.map(resolveWineAssetUrls)),

  getRecommendedWines: (limit = 10): Promise<WineSummaryDto[]> =>
    http
      .get<WineSummaryDto[]>("/wines/recommended", { params: { limit } })
      .then((r) => r.data.map(resolveWineAssetUrls)),

  getPopularWines: (limit = 10): Promise<WineSummaryDto[]> =>
    http
      .get<WineSummaryDto[]>("/wines/popular", { params: { limit } })
      .then((r) => r.data.map(resolveWineAssetUrls)),

  getAiProfile: (id: string, language = "es"): Promise<AiWineProfileDto> =>
    http
      .get<AiWineProfileDto>(`/wines/${id}/ai-profile`, { params: { language } })
      .then((r) => r.data),

  getAiProfileStatus: (id: string, language = "es"): Promise<AiProfileStatusDto> =>
    http
      .get<AiProfileStatusDto>(`/wines/${id}/ai-profile/status`, { params: { language } })
      .then((r) => r.data),

  generateAiProfile: (id: string, language = "es"): Promise<AiWineProfileDto> =>
    http
      .post<AiWineProfileDto>(
        `/wines/${id}/ai-profile`,
        { language },
        { timeout: WINE_OPERATION_TIMEOUTS.aiGeneration },
      )
      .then((r) => r.data),

  regenerateAiProfile: (id: string, language = "es"): Promise<AiWineProfileDto> =>
    http
      .post<AiWineProfileDto>(`/wines/${id}/ai-profile/generate`, undefined, {
        params: { language },
        timeout: WINE_OPERATION_TIMEOUTS.aiGeneration,
      })
      .then((r) => r.data),

  compareWines: (wineAId: string, wineBId: string, language = "es-AR"): Promise<CompareResultDto> =>
    http
      .post<CompareResultDto>(
        "/wines/compare",
        { wineAId, wineBId, language },
        { timeout: WINE_OPERATION_TIMEOUTS.aiGeneration },
      )
      .then((r) => r.data),

  scanLabel: (
    imageUri: string,
    observedText: string[],
    signal?: AbortSignal,
  ): Promise<WineScanResultDto> => {
    const formData = new FormData();
    formData.append("image", {
      uri: imageUri,
      name: "wine-label.jpg",
      type: "image/jpeg",
    } as unknown as Blob);
    observedText.forEach((line) => formData.append("observedText", line));

    return http
      .post<WineScanResultDto>("/wines/scan", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: WINE_OPERATION_TIMEOUTS.labelScan,
        signal,
      })
      .then((r) => ({
        ...r.data,
        wine: r.data.wine ? resolveWineAssetUrls(r.data.wine) : r.data.wine,
        suggestions: r.data.suggestions?.map(resolveWineAssetUrls),
        candidates: r.data.candidates?.map((candidate) => ({
          ...candidate,
          wine: resolveWineAssetUrls(candidate.wine),
        })),
      }));
  },

  submitWine: (input: WineSubmissionRequestDto): Promise<WineSubmissionResultDto> => {
    const formData = new FormData();
    if (input.imageUri) {
      formData.append("image", {
        uri: input.imageUri,
        name: "wine-label.jpg",
        type: "image/jpeg",
      } as unknown as Blob);
    }
    formData.append("wineName", input.wineName);
    formData.append("wineryName", input.wineryName);
    if (input.wineryId) formData.append("wineryId", input.wineryId);
    if (input.wineType) formData.append("wineType", input.wineType);
    if (input.vintage) formData.append("vintage", String(input.vintage));
    input.grapes?.forEach((grape) => formData.append("grapes", grape));
    if (input.country) formData.append("country", input.country);
    if (input.countryId) formData.append("countryId", input.countryId);
    if (input.region) formData.append("region", input.region);
    if (input.regionId) formData.append("regionId", input.regionId);
    if (input.alcoholContent !== undefined) {
      formData.append("alcoholContent", String(input.alcoholContent));
    }
    if (input.notes) formData.append("notes", input.notes);
    return http
      .post<WineSubmissionResultDto>("/wines/submissions", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: WINE_OPERATION_TIMEOUTS.labelUpload,
      })
      .then((response) => ({
        ...response.data,
        wine: response.data.wine ? resolveWineAssetUrls(response.data.wine) : null,
      }));
  },

  getMySubmissions: (page = 0, size = 20): Promise<PaginatedDto<WineSubmissionDetailsDto>> =>
    http
      .get<PaginatedDto<WineSubmissionDetailsDto>>("/wines/submissions", {
        params: { page, size },
      })
      .then((response) => resolveWinePageAssetUrls(response.data)),

  attachLabelImage: (
    wineId: string,
    imageUri: string,
    observedText: string[],
  ): Promise<WineLabelImageAttachmentDto> => {
    const formData = new FormData();
    formData.append("image", {
      uri: imageUri,
      name: "wine-label.jpg",
      type: "image/jpeg",
    } as unknown as Blob);
    observedText.forEach((line) => formData.append("observedText", line));
    return http
      .post<WineLabelImageAttachmentDto>(`/wines/${wineId}/label-image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: WINE_OPERATION_TIMEOUTS.labelUpload,
      })
      .then((response) => resolveWineAssetUrls(response.data));
  },

  searchByText: (search: string): Promise<WinesPageResponseDto> =>
    http
      .get<WinesPageResponseDto>("/wines", { params: { search, page: 0, size: 10 } })
      .then((r) => resolveWinePageAssetUrls(r.data)),

  addToFavorites: (wineId: string): Promise<void> =>
    http.post(`/wines/${wineId}/favorite`).then(() => undefined),

  removeFromFavorites: (wineId: string): Promise<void> =>
    http.delete(`/wines/${wineId}/favorite`).then(() => undefined),
};
