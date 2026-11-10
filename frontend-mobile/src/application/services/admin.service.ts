/**
 * Admin Service.
 * @architecture: Capa 3 — Aplicación
 */
import { adminApiClient } from "@/infrastructure/api/clients/admin.client";
import type { EventCancellationRequest } from "@/domain/event/eventCancellation";
import { toSuspensionRequest, type SuspensionReason } from "@/domain/admin/suspensionReason";
import type { AdminUserUpdate } from "@/domain/admin/adminUserDraft";
import { mapAiWineProfile } from "@/domain/wine/wine.mappers";
import type { AiWineProfile } from "@/domain/wine/wine.types";
import type { AdminStatsDto, AdminWineSubmissionDto } from "@/infrastructure/api/dto/admin.dto";
import type {
  AdminStats,
  AdminWineSubmission,
  AdminWineSubmissionStatus,
  AdminWineSubmissionDecisionInput,
  AdminWine,
  AdminWinePayload,
  AdminWinery,
  AdminWineryPayload,
  AdminEvent,
  AdminEventPayload,
  AdminRoute,
  AdminRoutePayload,
  AdminUser,
  AdminReview,
  AdminCountry,
  AdminRegion,
  AdminPaginatedResult,
} from "@/domain/admin/admin.types";
import {
  mapAdminEventFromRaw,
  mapAdminReviewFromRaw,
  mapAdminStatsFromRaw,
  mapAdminUserFromRaw,
  mapAdminWineFromRaw,
  mapAdminWineryFromRaw,
} from "@/domain/admin/admin.mappers";

function mapPaginated<TIn, TOut>(
  raw: { items: TIn[]; totalItems: number },
  mapper: (value: TIn) => TOut,
): AdminPaginatedResult<TOut> {
  return {
    items: raw.items.map(mapper),
    totalItems: raw.totalItems,
  };
}

function mapWineSubmission(submission: AdminWineSubmissionDto): AdminWineSubmission {
  return {
    id: submission.id,
    submittedBy: submission.submittedBy,
    submittedByUsername: submission.submittedByUsername?.trim() || null,
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
    reviewConfidence: submission.reviewConfidence ?? null,
    matchedWineId: submission.matchedWineId ?? null,
    createdWineId: submission.createdWineId ?? null,
    reviewedBy: submission.reviewedBy ?? null,
    reviewedAt: submission.reviewedAt ?? null,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
    wineryId: submission.wineryId ?? null,
    countryId: submission.countryId ?? null,
    regionId: submission.regionId ?? null,
    proposedGrapes: submission.proposedGrapes ?? [],
  };
}

export const adminService = {
  async getWineSubmissions(
    page: number,
    size: number,
    status?: AdminWineSubmissionStatus,
    search?: string,
  ) {
    return mapPaginated(
      await adminApiClient.getWineSubmissions({ page, size, status, search }),
      mapWineSubmission,
    );
  },
  async getWineSubmission(id: string) {
    return mapWineSubmission(await adminApiClient.getWineSubmission(id));
  },
  decideWineSubmission: (id: string, input: AdminWineSubmissionDecisionInput) =>
    adminApiClient.decideWineSubmission(id, input),
  getWineSubmissionImage: (id: string) => adminApiClient.getWineSubmissionImage(id),

  async getStats(): Promise<AdminStats> {
    const stats = await adminApiClient.getStats();
    return mapAdminStatsFromRaw(stats as AdminStatsDto);
  },

  async getWines(
    page: number,
    size: number,
    search?: string,
  ): Promise<AdminPaginatedResult<AdminWine>> {
    const result = await adminApiClient.getWines({ page, size, search });
    return mapPaginated(result, (wine) =>
      mapAdminWineFromRaw(wine as unknown as Record<string, unknown>),
    );
  },
  async getWine(id: string): Promise<AdminWine> {
    const wine = await adminApiClient.getWine(id);
    return mapAdminWineFromRaw(wine as unknown as Record<string, unknown>);
  },
  async createWine(payload: AdminWinePayload): Promise<AdminWine> {
    const wine = await adminApiClient.createWine(await prepareWineImage(payload));
    return mapAdminWineFromRaw(wine as unknown as Record<string, unknown>);
  },
  async updateWine(id: string, payload: Partial<AdminWinePayload>): Promise<AdminWine> {
    const wine = await adminApiClient.updateWine(id, await prepareWineImage(payload));
    return mapAdminWineFromRaw(wine as unknown as Record<string, unknown>);
  },
  deleteWine: (id: string): Promise<void> => adminApiClient.deleteWine(id),

  async getWineries(
    page: number,
    size: number,
    search?: string,
    country?: string,
    region?: string,
  ): Promise<AdminPaginatedResult<AdminWinery>> {
    return mapPaginated(
      await adminApiClient.getWineries({ page, size, search, country, region }),
      (winery) => mapAdminWineryFromRaw(winery as unknown as Record<string, unknown>),
    );
  },
  async getWinery(id: string): Promise<AdminWinery> {
    return mapAdminWineryFromRaw(
      (await adminApiClient.getWinery(id)) as unknown as Record<string, unknown>,
    );
  },

  async createWinery(payload: AdminWineryPayload): Promise<AdminWinery> {
    return mapAdminWineryFromRaw(
      (await adminApiClient.createWinery(payload)) as unknown as Record<string, unknown>,
    );
  },
  updateWinery: (id: string, payload: AdminWineryPayload): Promise<AdminWinery> =>
    adminApiClient.updateWinery(id, payload) as Promise<AdminWinery>,
  deleteWinery: (id: string): Promise<void> => adminApiClient.deleteWinery(id),

  async getEvents(
    page: number,
    size: number,
    search?: string,
  ): Promise<AdminPaginatedResult<AdminEvent>> {
    return mapPaginated(await adminApiClient.getEvents({ page, size, search }), (event) =>
      mapAdminEventFromRaw(event as unknown as Record<string, unknown>),
    );
  },
  async getEvent(id: string): Promise<AdminEvent> {
    return mapAdminEventFromRaw(
      (await adminApiClient.getEvent(id)) as unknown as Record<string, unknown>,
    );
  },

  async createEvent(payload: AdminEventPayload): Promise<AdminEvent> {
    const event = await adminApiClient.createEvent(payload);
    return mapAdminEventFromRaw(event as unknown as Record<string, unknown>);
  },
  async updateEvent(id: string, payload: AdminEventPayload): Promise<AdminEvent> {
    const event = await adminApiClient.updateEvent(id, payload);
    return mapAdminEventFromRaw(event as unknown as Record<string, unknown>);
  },
  deleteEvent: (id: string, cancellation?: EventCancellationRequest): Promise<void> =>
    cancellation ? adminApiClient.deleteEvent(id, cancellation) : adminApiClient.deleteEvent(id),

  async getRoutes(
    page: number,
    size: number,
    search?: string,
  ): Promise<AdminPaginatedResult<AdminRoute>> {
    return mapPaginated(
      await adminApiClient.getRoutes({ page, size, search }),
      (route) => route as unknown as AdminRoute,
    );
  },
  getRoute: (id: string): Promise<AdminRoute> => adminApiClient.getRoute(id) as Promise<AdminRoute>,
  createRoute: (payload: AdminRoutePayload): Promise<AdminRoute> =>
    adminApiClient.createRoute(payload) as Promise<AdminRoute>,
  updateRoute: (id: string, payload: AdminRoutePayload): Promise<AdminRoute> =>
    adminApiClient.updateRoute(id, payload) as Promise<AdminRoute>,
  deleteRoute: (id: string): Promise<void> => adminApiClient.deleteRoute(id),

  async getUsers(
    page: number,
    size: number,
    search?: string,
  ): Promise<AdminPaginatedResult<AdminUser>> {
    const result = await adminApiClient.getUsers({ page, size, search });
    return mapPaginated(result, (user) =>
      mapAdminUserFromRaw(user as unknown as Record<string, unknown>),
    );
  },
  /** Names and active flag; an empty update sends nothing. */
  async updateUser(userId: string, update: AdminUserUpdate): Promise<void> {
    if (Object.keys(update).length === 0) return;
    await adminApiClient.updateUser(userId, update);
  },
  updateUserRole: (userId: string, role: string): Promise<void> =>
    adminApiClient.updateUserRole(userId, role),
  banUser: (userId: string, reasonCode: SuspensionReason, note?: string): Promise<void> => {
    const request = toSuspensionRequest(reasonCode, note);
    return adminApiClient.banUser(userId, request.reasonCode, request.reason);
  },
  unbanUser: (userId: string): Promise<void> => adminApiClient.unbanUser(userId),
  deleteUser: (userId: string): Promise<void> => adminApiClient.deleteUser(userId),

  async getReviews(
    page: number,
    size: number,
    search?: string,
  ): Promise<AdminPaginatedResult<AdminReview>> {
    return mapPaginated(
      await adminApiClient.getReviews({ page, size, search }),
      (review) => mapAdminReviewFromRaw(review as unknown as Record<string, unknown>),
    );
  },
  deleteReview: (id: string): Promise<void> => adminApiClient.deleteReview(id),

  getCountries: (): Promise<AdminCountry[]> =>
    adminApiClient.getCountries() as Promise<AdminCountry[]>,
  getRegionsByCountry: (countryId: string): Promise<AdminRegion[]> =>
    adminApiClient.getRegionsByCountry(countryId) as Promise<AdminRegion[]>,

  updateAiProfile: (
    wineId: string,
    profileJson: Record<string, unknown>,
    language: string,
  ): Promise<AiWineProfile> => adminApiClient.updateAiProfile(wineId, profileJson, language).then(mapAiWineProfile),

  searchWineries: (
    search: string,
    page = 0,
    size = 10,
  ): Promise<AdminPaginatedResult<AdminWinery>> =>
    adminApiClient
      .getWineries({ page, size, search })
      .then((result) =>
        mapPaginated(result, (winery) =>
          mapAdminWineryFromRaw(winery as unknown as Record<string, unknown>),
        ),
      ),
};

async function prepareWineImage<T extends { imageUrl?: string | null }>(payload: T): Promise<T> {
  if (!payload.imageUrl?.startsWith("data:")) return payload;
  const imageUrl = await adminApiClient.uploadCatalogImage(payload.imageUrl);
  return { ...payload, imageUrl };
}
