import { resolveWineAssetUrls, resolveWinePageAssetUrls } from "@/infrastructure/api/resolveApiAssetUrl";
import { fromByteArray } from "base64-js";
import { toPatchRequest } from "./patchRequest";
/**
 * Admin API Client.
 * @architecture: Capa 4 — Infraestructura HTTP
 */
import { http } from "@/infrastructure/api/http";
import type { AiWineProfileDto } from "@/infrastructure/api/dto/wines.dto";
import type {
  AdminStatsDto,
  AdminWineSubmissionDto,
  AdminWineSubmissionDecisionRequestDto,
  AdminWineDto,
  AdminWinePayloadDto,
  AdminWineryDto,
  AdminWineryPayloadDto,
  AdminEventDto,
  AdminEventPayloadDto,
  AdminRouteDto,
  AdminRoutePayloadDto,
  AdminUserDto,
  AdminReviewDto,
  AdminCountryDto,
  AdminRegionDto,
  AdminUserUpdateRequestDto,
} from "@/infrastructure/api/dto/admin.dto";
import type { CancelEventRequestDto } from "@/infrastructure/api/dto/events.dto";
import { normalizePaginated } from "./pagination";

export const adminApiClient = {
  async getWineSubmissions(params: {
    page: number;
    size: number;
    status?: AdminWineSubmissionDto["status"];
    search?: string;
  }) {
    const response = await http.get("/admin/wine-submissions", { params });
    return normalizePaginated<AdminWineSubmissionDto>(response.data);
  },
  async getWineSubmission(id: string): Promise<AdminWineSubmissionDto> {
    return (await http.get<AdminWineSubmissionDto>(`/admin/wine-submissions/${id}`)).data;
  },
  async decideWineSubmission(
    id: string,
    input: AdminWineSubmissionDecisionRequestDto,
  ): Promise<void> {
    await http.patch(`/admin/wine-submissions/${id}/decision`, input);
  },
  async getWineSubmissionImage(id: string): Promise<string> {
    const response = await http.get<ArrayBuffer>(`/admin/wine-submissions/${id}/image`, {
      responseType: "arraybuffer",
    });
    return `data:${response.headers["content-type"] ?? "image/jpeg"};base64,${fromByteArray(new Uint8Array(response.data))}`;
  },

  async uploadCatalogImage(dataUrl: string): Promise<string> {
    const response = await http.post<{ imageUrl: string }>("/admin/catalog-images", { dataUrl });
    return response.data.imageUrl;
  },
  getStats: async (): Promise<AdminStatsDto> => {
    const res = await http.get<AdminStatsDto>("/admin/stats");
    return res.data;
  },

  // Wines
  getWines: async (params: {
    page: number;
    size: number;
    search?: string;
  }): Promise<{ items: AdminWineDto[]; totalItems: number }> => {
    const res = await http.get("/admin/wines", { params });
    return resolveWinePageAssetUrls(normalizePaginated<AdminWineDto>(res.data as Record<string, unknown>));
  },
  getWine: async (id: string): Promise<AdminWineDto> => {
    const res = await http.get<AdminWineDto>(`/admin/wines/${id}`);
    return resolveWineAssetUrls(res.data);
  },
  createWine: (payload: AdminWinePayloadDto): Promise<AdminWineDto> =>
    http.post<AdminWineDto>("/admin/wines", payload).then((r) => resolveWineAssetUrls(r.data)),
  updateWine: (id: string, payload: Partial<AdminWinePayloadDto>): Promise<AdminWineDto> =>
    http.patch<AdminWineDto>(`/admin/wines/${id}`, toPatchRequest(payload)).then((r) => resolveWineAssetUrls(r.data)),
  deleteWine: (id: string): Promise<void> =>
    http.delete(`/admin/wines/${id}`).then(() => undefined),

  // Wineries
  getWineries: async (params: {
    page: number;
    size: number;
    search?: string;
    country?: string;
    region?: string;
  }): Promise<{ items: AdminWineryDto[]; totalItems: number }> => {
    const res = await http.get("/admin/wineries", { params });
    return normalizePaginated<AdminWineryDto>(res.data as Record<string, unknown>);
  },
  getWinery: (id: string): Promise<AdminWineryDto> =>
    http.get<AdminWineryDto>(`/admin/wineries/${id}`).then((r) => r.data),

  createWinery: (payload: AdminWineryPayloadDto): Promise<AdminWineryDto> =>
    http.post<AdminWineryDto>("/admin/wineries", payload).then((r) => r.data),
  updateWinery: (id: string, payload: AdminWineryPayloadDto): Promise<AdminWineryDto> =>
    http
      .patch<AdminWineryDto>(`/admin/wineries/${id}`, toPatchRequest(payload))
      .then((r) => r.data),
  deleteWinery: (id: string): Promise<void> =>
    http.delete(`/admin/wineries/${id}`).then(() => undefined),

  // Events
  getEvents: async (params: {
    page: number;
    size: number;
    search?: string;
  }): Promise<{ items: AdminEventDto[]; totalItems: number }> => {
    const res = await http.get("/admin/events", { params });
    const page = normalizePaginated<AdminEventDto>(res.data as Record<string, unknown>);
    return { ...page, items: page.items.map(resolveWineAssetUrls) };
  },
  getEvent: (id: string): Promise<AdminEventDto> =>
    http.get<AdminEventDto>(`/admin/events/${id}`).then((r) => resolveWineAssetUrls(r.data)),
  createEvent: (payload: AdminEventPayloadDto): Promise<AdminEventDto> =>
    http.post<AdminEventDto>("/admin/events", payload).then((r) => resolveWineAssetUrls(r.data)),
  updateEvent: (id: string, payload: AdminEventPayloadDto): Promise<AdminEventDto> =>
    http.patch<AdminEventDto>(`/admin/events/${id}`, toPatchRequest(payload)).then((r) => resolveWineAssetUrls(r.data)),
  deleteEvent: (id: string, body?: CancelEventRequestDto): Promise<void> =>
    (body
      ? http.delete(`/admin/events/${id}`, { data: body })
      : http.delete(`/admin/events/${id}`)
    ).then(() => undefined),

  // Routes
  getRoutes: async (params: {
    page: number;
    size: number;
    search?: string;
  }): Promise<{ items: AdminRouteDto[]; totalItems: number }> => {
    const res = await http.get("/admin/routes", { params });
    const page = normalizePaginated<AdminRouteDto>(res.data as Record<string, unknown>);
    return { ...page, items: page.items.map(resolveWineAssetUrls) };
  },
  getRoute: async (id: string): Promise<AdminRouteDto> => {
    const res = await http.get<AdminRouteDto | { data?: AdminRouteDto }>(`/admin/routes/${id}`);
    const data = (res.data as { data?: AdminRouteDto }).data ?? (res.data as AdminRouteDto);
    return resolveWineAssetUrls(data);
  },
  createRoute: (payload: AdminRoutePayloadDto): Promise<AdminRouteDto> =>
    http.post<AdminRouteDto>("/admin/routes", payload).then((r) => resolveWineAssetUrls(r.data)),
  updateRoute: (id: string, payload: AdminRoutePayloadDto): Promise<AdminRouteDto> =>
    http.patch<AdminRouteDto>(`/admin/routes/${id}`, toPatchRequest(payload)).then((r) => resolveWineAssetUrls(r.data)),
  deleteRoute: (id: string): Promise<void> =>
    http.delete(`/admin/routes/${id}`).then(() => undefined),

  // Users
  getUsers: async (params: {
    page: number;
    size: number;
    search?: string;
  }): Promise<{ items: AdminUserDto[]; totalItems: number }> => {
    // The admin listing carries points and badgeTier; GET /users does not (#455).
    const res = await http.get("/admin/users", { params });
    return normalizePaginated<AdminUserDto>(res.data as Record<string, unknown>);
  },
  /** A plain record PATCH: no clearFields, a field left out keeps its value. */
  updateUser: (userId: string, request: AdminUserUpdateRequestDto): Promise<void> =>
    http.patch(`/admin/users/${userId}`, request).then(() => undefined),
  updateUserRole: (userId: string, role: string): Promise<void> =>
    http.put(`/admin/users/${userId}/role`, { role }).then(() => undefined),
  /** `reason` is the admin's detail; the server shares it with the account holder only for OTHER. */
  banUser: (userId: string, reasonCode: string, reason?: string): Promise<void> =>
    http
      .post(`/admin/users/${userId}/ban`, reason ? { reasonCode, reason } : { reasonCode })
      .then(() => undefined),
  unbanUser: (userId: string): Promise<void> =>
    http.post(`/admin/users/${userId}/unban`).then(() => undefined),
  deleteUser: (userId: string): Promise<void> =>
    http.delete(`/admin/users/${userId}`).then(() => undefined),

  // Reviews
  getReviews: async (params: {
    page: number;
    size: number;
    search?: string;
  }): Promise<{ items: AdminReviewDto[]; totalItems: number }> => {
    const res = await http.get("/admin/reviews", { params });
    return normalizePaginated<AdminReviewDto>(res.data as Record<string, unknown>);
  },
  deleteReview: (id: string): Promise<void> =>
    http.delete(`/admin/reviews/${id}`).then(() => undefined),

  // Regions
  getCountries: (): Promise<AdminCountryDto[]> =>
    http.get<AdminCountryDto[]>("/regions/countries").then((r) => r.data ?? []),
  getRegionsByCountry: (countryId: string): Promise<AdminRegionDto[]> =>
    http.get<AdminRegionDto[]>(`/regions/country/${countryId}`).then((r) => r.data ?? []),

  // AI Profile
  updateAiProfile: (
    wineId: string,
    profileJson: Record<string, unknown>,
    language: string,
  ): Promise<AiWineProfileDto> =>
    http
      .patch<AiWineProfileDto>(`/wines/${wineId}/ai-profile`, profileJson, { params: { language } })
      .then((response) => response.data),
};
