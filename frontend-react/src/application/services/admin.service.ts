/**
 * Admin Service
 *
 * Application service layer for all admin module operations.
 * Orchestrates: admin client calls → domain type returns.
 */

import { adminClient } from '@api/clients/admin.client'
import { toCancellationRequest, type EventCancellation } from '@domain/event/eventCancellation'
import { toBanUserPayload, type SuspensionReason } from '@domain/admin/suspensionReason'
import { isAdminUserUpdateEmpty, type AdminUserUpdate } from '@domain/admin/adminUserDraft'
import type {
  AdminStatsDto,
  AdminWineSubmissionDto,
} from '@api/dto/admin.dto'
import type {
  AdminStats,
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
  AdminWineSubmission,
  AdminWineSubmissionDecisionInput,
  AdminWineSubmissionStatus,
} from '@domain/admin/admin.types'
import { mapAdminReviewFromRaw, mapAdminWineryFromRaw, mapAdminStatsFromRaw, mapAdminUserFromRaw, mapAdminWineFromRaw } from '@domain/admin/admin.mappers'

function mapPaginated<TIn, TOut>(
  raw: { items: TIn[]; totalItems: number },
  mapper: (value: TIn) => TOut,
): AdminPaginatedResult<TOut> {
  return {
    items: raw.items.map(mapper),
    totalItems: raw.totalItems,
  }
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
  }
}

export const adminService = {
  // ── Stats ─────────────────────────────────────────────────────
  async getStats(): Promise<AdminStats> {
    const stats = await adminClient.getStats()
    return mapAdminStatsFromRaw(stats as AdminStatsDto)
  },

  // ── Wines ─────────────────────────────────────────────────────
  async getWines(page: number, size: number, search?: string): Promise<AdminPaginatedResult<AdminWine>> {
    const result = await adminClient.getWines({ page, size, search })
    return mapPaginated(result, (wine) => mapAdminWineFromRaw(wine as unknown as Record<string, unknown>))
  },

  async getWine(id: string): Promise<AdminWine> {
    const wine = await adminClient.getWine(id)
    return mapAdminWineFromRaw(wine as unknown as Record<string, unknown>)
  },

  async createWine(payload: AdminWinePayload): Promise<AdminWine> {
    const wine = await adminClient.createWine(await prepareWineImage(payload))
    return mapAdminWineFromRaw(wine as unknown as Record<string, unknown>)
  },

  async updateWine(id: string, payload: Partial<AdminWinePayload>): Promise<AdminWine> {
    const wine = await adminClient.updateWine(id, await prepareWineImage(payload))
    return mapAdminWineFromRaw(wine as unknown as Record<string, unknown>)
  },

  async deleteWine(id: string): Promise<void> {
    return adminClient.deleteWine(id)
  },

  // ── Wineries ──────────────────────────────────────────────────
  async getWineries(
    page: number,
    size: number,
    search?: string,
    country?: string,
    region?: string,
  ): Promise<AdminPaginatedResult<AdminWinery>> {
    return mapPaginated(await adminClient.getWineries({ page, size, search, country, region }), (winery) => mapAdminWineryFromRaw(winery as unknown as Record<string, unknown>))
  },

  async getWinery(id: string): Promise<AdminWinery> {
    return mapAdminWineryFromRaw(await adminClient.getWinery(id) as unknown as Record<string, unknown>);
  },

  async createWinery(payload: AdminWineryPayload): Promise<AdminWinery> {
    return adminClient.createWinery(payload) as Promise<AdminWinery>
  },

  async updateWinery(id: string, payload: AdminWineryPayload): Promise<AdminWinery> {
    return adminClient.updateWinery(id, payload) as Promise<AdminWinery>
  },

  async deleteWinery(id: string): Promise<void> {
    return adminClient.deleteWinery(id)
  },

  // ── Events ────────────────────────────────────────────────────
  async getEvents(page: number, size: number, search?: string): Promise<AdminPaginatedResult<AdminEvent>> {
    return mapPaginated(await adminClient.getEvents({ page, size, search }), (event) => event as unknown as AdminEvent)
  },

  async getEvent(id: string): Promise<AdminEvent> {
    return adminClient.getEvent(id) as Promise<AdminEvent>
  },

  async createEvent(payload: AdminEventPayload): Promise<AdminEvent> {
    return adminClient.createEvent(payload) as Promise<AdminEvent>
  },

  async updateEvent(id: string, payload: AdminEventPayload): Promise<AdminEvent> {
    return adminClient.updateEvent(id, payload) as Promise<AdminEvent>
  },

  /** Cancels an event; without a cancellation the backend applies its default reason. */
  async deleteEvent(id: string, cancellation?: EventCancellation): Promise<void> {
    return adminClient.deleteEvent(id, cancellation && toCancellationRequest(cancellation.reason, cancellation.note))
  },

  // ── Routes ────────────────────────────────────────────────────
  async getRoutes(page: number, size: number, search?: string): Promise<AdminPaginatedResult<AdminRoute>> {
    return mapPaginated(await adminClient.getRoutes({ page, size, search }), (route) => route as unknown as AdminRoute)
  },

  async getRoute(id: string): Promise<AdminRoute> {
    return adminClient.getRoute(id) as Promise<AdminRoute>
  },

  async createRoute(payload: AdminRoutePayload): Promise<AdminRoute> {
    return adminClient.createRoute(payload) as Promise<AdminRoute>
  },

  async updateRoute(id: string, payload: AdminRoutePayload): Promise<AdminRoute> {
    return adminClient.updateRoute(id, payload) as Promise<AdminRoute>
  },

  async deleteRoute(id: string): Promise<void> {
    return adminClient.deleteRoute(id)
  },

  // ── Users ─────────────────────────────────────────────────────
  async getUsers(page: number, size: number, search?: string): Promise<AdminPaginatedResult<AdminUser>> {
    const result = await adminClient.getUsers({ page, size, search })
    return mapPaginated(result, (user) => mapAdminUserFromRaw(user as unknown as Record<string, unknown>))
  },

  /** Saves an account's names; an unchanged draft sends no request. */
  async updateUser(userId: string, update: AdminUserUpdate): Promise<void> {
    if (isAdminUserUpdateEmpty(update)) return
    return adminClient.updateUser(userId, { firstName: update.firstName, lastName: update.lastName })
  },

  async updateUserRole(userId: string, role: string): Promise<void> {
    return adminClient.updateUserRole(userId, role)
  },

  /** Bans with a preset reason; the detail only reaches the account holder with `OTHER`. */
  async banUser(userId: string, reasonCode: SuspensionReason, note?: string): Promise<void> {
    const payload = toBanUserPayload(reasonCode, note)
    return adminClient.banUser(userId, payload.reasonCode, payload.reason)
  },

  async unbanUser(userId: string): Promise<void> {
    return adminClient.unbanUser(userId)
  },

  async deleteUser(userId: string): Promise<void> {
    return adminClient.deleteUser(userId)
  },

  // ── Reviews ───────────────────────────────────────────────────
  async getReviews(page: number, size: number, search?: string): Promise<AdminPaginatedResult<AdminReview>> {
    return mapPaginated(await adminClient.getReviews({ page, size, search }), (review) => mapAdminReviewFromRaw(review as unknown as Record<string, unknown>))
  },

  async deleteReview(id: string): Promise<void> {
    return adminClient.deleteReview(id)
  },

  // ── Regions ───────────────────────────────────────────────────
  async getCountries(): Promise<AdminCountry[]> {
    return adminClient.getCountries() as Promise<AdminCountry[]>
  },

  async getRegionsByCountry(countryId: string): Promise<AdminRegion[]> {
    return adminClient.getRegionsByCountry(countryId) as Promise<AdminRegion[]>
  },

  // ── AI Profile ────────────────────────────────────────────────
  async updateAiProfile(wineId: string, profileJson: Record<string, unknown>, language: string): Promise<void> {
    return adminClient.updateAiProfile(wineId, profileJson, language)
  },

  // ── Winery search (used in wine & route forms) ────────────────
  async searchWineries(search: string, page = 0, size = 10): Promise<AdminPaginatedResult<AdminWinery>> {
    return mapPaginated(await adminClient.getWineries({ page, size, search }), (winery) => mapAdminWineryFromRaw(winery as unknown as Record<string, unknown>))
  },

  async getWineSubmissions(
    page: number,
    size: number,
    status?: AdminWineSubmissionStatus,
    search?: string,
  ): Promise<AdminPaginatedResult<AdminWineSubmission>> {
    const result = await adminClient.getWineSubmissions({ page, size, status, search })
    return mapPaginated(result, mapWineSubmission)
  },

  async getWineSubmission(id: string): Promise<AdminWineSubmission> {
    const submission = await adminClient.getWineSubmission(id)
    return mapWineSubmission(submission)
  },

  async decideWineSubmission(
    id: string,
    input: AdminWineSubmissionDecisionInput,
  ): Promise<void> {
    return adminClient.decideWineSubmission(id, input)
  },

  async getWineSubmissionImage(id: string): Promise<Blob> {
    return adminClient.getWineSubmissionImage(id)
  },
}

export default adminService

async function prepareWineImage<T extends { imageUrl?: string | null }>(payload: T): Promise<T> {
  if (!payload.imageUrl?.startsWith("data:")) return payload;
  const imageUrl = await adminClient.uploadCatalogImage(payload.imageUrl);
  return { ...payload, imageUrl };
}
