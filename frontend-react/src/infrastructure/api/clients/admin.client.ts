import { resolveWineAssetUrls, resolveWinePageAssetUrls, withAvatar, withReviewerAvatar } from "@infrastructure/http/resolveApiAssetUrl";
import { toPatchRequest } from "./patchRequest";
/**
 * Admin API Client
 *
 * Handles all admin-specific API calls to /admin/* endpoints.
 * Uses the configured axios instance for automatic token handling.
 */

import http from '@infrastructure/http/http'
import type {
  AdminStatsDto,
  AdminWineDto,
  AdminWinePayloadDto,
  AdminWineryDto,
  AdminWineryPayloadDto,
  AdminEventDto,
  AdminEventPayloadDto,
  AdminRouteDto,
  AdminRoutePayloadDto,
  AdminUserDto,
  AdminUserUpdateRequestDto,
  AdminReviewDto,
  AdminCountryDto,
  AdminRegionDto,
  AdminWineSubmissionDto,
  AdminWineSubmissionDecisionRequestDto,
} from '@api/dto/admin.dto'
import type { CancelEventRequestDto } from '@api/dto/events.dto'
import { normalizePaginated } from './pagination'


export const adminClient = {
  async uploadCatalogImage(dataUrl: string): Promise<string> {
    const response = await http.post<{ imageUrl: string }>("/admin/catalog-images", { dataUrl });
    return response.data.imageUrl;
  },
  // ── Stats ─────────────────────────────────────────────────────
  async getStats(): Promise<AdminStatsDto> {
    const res = await http.get<AdminStatsDto>('/admin/stats')
    return res.data
  },

  // ── Wines ─────────────────────────────────────────────────────
  async getWines(params: { page: number; size: number; search?: string }): Promise<{ items: AdminWineDto[]; totalItems: number }> {
    const res = await http.get('/admin/wines', { params })
    return resolveWinePageAssetUrls(normalizePaginated<AdminWineDto>(res.data))
  },

  async getWine(id: string): Promise<AdminWineDto> {
    const res = await http.get<AdminWineDto>(`/admin/wines/${id}`)
    return resolveWineAssetUrls(res.data)
  },

  async createWine(payload: AdminWinePayloadDto): Promise<AdminWineDto> {
    const res = await http.post<AdminWineDto>('/admin/wines', payload)
    return resolveWineAssetUrls(res.data)
  },

  async updateWine(id: string, payload: Partial<AdminWinePayloadDto>): Promise<AdminWineDto> {
    const res = await http.patch<AdminWineDto>(`/admin/wines/${id}`, toPatchRequest(payload))
    return resolveWineAssetUrls(res.data)
  },

  async deleteWine(id: string): Promise<void> {
    await http.delete(`/admin/wines/${id}`)
  },

  // ── Wineries ──────────────────────────────────────────────────
  async getWineries(params: {
    page: number
    size: number
    search?: string
    country?: string
    region?: string
  }): Promise<{ items: AdminWineryDto[]; totalItems: number }> {
    const res = await http.get('/admin/wineries', { params })
    return normalizePaginated<AdminWineryDto>(res.data)
  },

  async getWinery(id: string): Promise<AdminWineryDto> {
    return (await http.get<AdminWineryDto>(`/admin/wineries/${id}`)).data;
  },

  async createWinery(payload: AdminWineryPayloadDto): Promise<AdminWineryDto> {
    const res = await http.post<AdminWineryDto>('/admin/wineries', payload)
    return res.data
  },

  async updateWinery(id: string, payload: AdminWineryPayloadDto): Promise<AdminWineryDto> {
    const res = await http.patch<AdminWineryDto>(`/admin/wineries/${id}`, toPatchRequest(payload))
    return res.data
  },

  async deleteWinery(id: string): Promise<void> {
    await http.delete(`/admin/wineries/${id}`)
  },

  // ── Events ────────────────────────────────────────────────────
  async getEvents(params: { page: number; size: number; search?: string }): Promise<{ items: AdminEventDto[]; totalItems: number }> {
    const res = await http.get('/admin/events', { params })
    const page = normalizePaginated<AdminEventDto>(res.data)
    return { ...page, items: page.items.map(resolveWineAssetUrls) }
  },

  async getEvent(id: string): Promise<AdminEventDto> {
    const res = await http.get<AdminEventDto>(`/admin/events/${id}`)
    return resolveWineAssetUrls(res.data)
  },

  async createEvent(payload: AdminEventPayloadDto): Promise<AdminEventDto> {
    const res = await http.post<AdminEventDto>('/admin/events', payload)
    return resolveWineAssetUrls(res.data)
  },

  async updateEvent(id: string, payload: AdminEventPayloadDto): Promise<AdminEventDto> {
    const res = await http.patch<AdminEventDto>(`/admin/events/${id}`, toPatchRequest(payload))
    return resolveWineAssetUrls(res.data)
  },

  /** Cancels an event, optionally with the cancellation reason (DELETE /admin/events/:id). */
  async deleteEvent(id: string, body?: CancelEventRequestDto): Promise<void> {
    const url = `/admin/events/${id}`
    await (body ? http.delete(url, { data: body }) : http.delete(url))
  },

  // ── Routes ────────────────────────────────────────────────────
  async getRoutes(params: { page: number; size: number; search?: string }): Promise<{ items: AdminRouteDto[]; totalItems: number }> {
    const res = await http.get('/admin/routes', { params })
    const page = normalizePaginated<AdminRouteDto>(res.data)
    return { ...page, items: page.items.map(resolveWineAssetUrls) }
  },

  async getRoute(id: string): Promise<AdminRouteDto> {
    const res = await http.get<AdminRouteDto | { data?: AdminRouteDto }>(`/admin/routes/${id}`)
    const data = (res.data as { data?: AdminRouteDto }).data ?? (res.data as AdminRouteDto)
    return resolveWineAssetUrls(data)
  },

  async createRoute(payload: AdminRoutePayloadDto): Promise<AdminRouteDto> {
    const res = await http.post<AdminRouteDto>('/admin/routes', payload)
    return resolveWineAssetUrls(res.data)
  },

  async updateRoute(id: string, payload: AdminRoutePayloadDto): Promise<AdminRouteDto> {
    const res = await http.patch<AdminRouteDto>(`/admin/routes/${id}`, toPatchRequest(payload))
    return resolveWineAssetUrls(res.data)
  },

  async deleteRoute(id: string): Promise<void> {
    await http.delete(`/admin/routes/${id}`)
  },

  // ── Users ─────────────────────────────────────────────────────
  async getUsers(params: { page: number; size: number; search?: string }): Promise<{ items: AdminUserDto[]; totalItems: number }> {
    // The admin endpoint adds each member's points and seal to the user fields.
    const res = await http.get('/admin/users', { params })
    const page = normalizePaginated<AdminUserDto>(res.data as Record<string, unknown>)
    return { ...page, items: page.items.map((user) => ('avatarUrl' in user ? withAvatar(user) : user)) }
  },

  /** Sent as is: an empty last name is a real value, not a field to clear. */
  async updateUser(userId: string, body: AdminUserUpdateRequestDto): Promise<void> {
    await http.patch(`/admin/users/${userId}`, body)
  },

  async updateUserRole(userId: string, role: string): Promise<void> {
    await http.put(`/admin/users/${userId}/role`, { role })
  },

  /** `reason` is the administrator's detail; the caller only passes it when the backend may share it. */
  async banUser(userId: string, reasonCode: string, reason?: string): Promise<void> {
    await http.post(`/admin/users/${userId}/ban`, reason ? { reasonCode, reason } : { reasonCode })
  },

  async unbanUser(userId: string): Promise<void> {
    await http.post(`/admin/users/${userId}/unban`)
  },

  async deleteUser(userId: string): Promise<void> {
    await http.delete(`/admin/users/${userId}`)
  },

  // ── Reviews ───────────────────────────────────────────────────
  async getReviews(params: { page: number; size: number; search?: string }): Promise<{ items: AdminReviewDto[]; totalItems: number }> {
    const res = await http.get('/admin/reviews', { params })
    const page = normalizePaginated<AdminReviewDto>(res.data)
    return { ...page, items: page.items.map(withReviewerAvatar) }
  },

  async deleteReview(id: string): Promise<void> {
    await http.delete(`/admin/reviews/${id}`)
  },

  // ── Regions (used by winery/route forms) ──────────────────────
  async getCountries(): Promise<AdminCountryDto[]> {
    const res = await http.get<AdminCountryDto[]>('/regions/countries')
    return res.data ?? []
  },

  async getRegionsByCountry(countryId: string): Promise<AdminRegionDto[]> {
    const res = await http.get<AdminRegionDto[]>(`/regions/country/${countryId}`)
    return res.data ?? []
  },

  // ── AI Profile (for wine AI editor) ───────────────────────────
  async updateAiProfile(wineId: string, profileJson: Record<string, unknown>, language: string): Promise<void> {
    await http.patch(`/wines/${wineId}/ai-profile`, profileJson, {
      params: { language },
    })
  },

  // ── Wine submissions ─────────────────────────────────────────
  async getWineSubmissions(params: {
    page: number
    size: number
    status?: AdminWineSubmissionDto['status']
    search?: string
  }): Promise<{ items: AdminWineSubmissionDto[]; totalItems: number }> {
    const res = await http.get('/admin/wine-submissions', { params })
    return normalizePaginated<AdminWineSubmissionDto>(res.data)
  },

  async getWineSubmission(id: string): Promise<AdminWineSubmissionDto> {
    const res = await http.get<AdminWineSubmissionDto>(`/admin/wine-submissions/${id}`)
    return res.data
  },

  async decideWineSubmission(
    id: string,
    input: AdminWineSubmissionDecisionRequestDto,
  ): Promise<void> {
    await http.patch(`/admin/wine-submissions/${id}/decision`, input)
  },

  async getWineSubmissionImage(id: string): Promise<Blob> {
    const res = await http.get<Blob>(`/admin/wine-submissions/${id}/image`, {
      responseType: 'blob',
    })
    return res.data
  },
}

export default adminClient
