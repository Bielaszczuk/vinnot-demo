import http from '@infrastructure/http/http'
import type { ApiResponse } from '@api/api.types'
import type {
  AnnouncementAudienceDto,
  AnnouncementPreviewDto,
  AnnouncementPreviewRequestDto,
  AnnouncementReachDto,
  AnnouncementRecordDto,
  AnnouncementRequestDto,
  PushEngagementDto,
  PushMetricsDto,
  PushSettingsDto,
} from '@api/dto/adminNotifications.dto'

const PUSH = '/admin/notifications/push'
const ANNOUNCEMENTS = '/admin/notifications/announcements'

/**
 * Admin notifications API (#310). Switch changes, tests and sends need a fresh reauthentication: the HTTP client
 * asks for it and retries on its own.
 */
export const adminNotificationsClient = {
  async getPushSettings(): Promise<PushSettingsDto> {
    return (await http.get<ApiResponse<PushSettingsDto>>(PUSH)).data.data
  },

  async setPushTypeEnabled(type: string, enabled: boolean): Promise<PushSettingsDto> {
    return (await http.put<ApiResponse<PushSettingsDto>>(`${PUSH}/types/${encodeURIComponent(type)}`, { enabled })).data.data
  },

  async getPushMetrics(days: number): Promise<PushMetricsDto> {
    return (await http.get<ApiResponse<PushMetricsDto>>(`${PUSH}/metrics`, { params: { days } })).data.data
  },

  async getPushEngagement(days: number): Promise<PushEngagementDto> {
    return (await http.get<ApiResponse<PushEngagementDto>>(`${PUSH}/engagement`, { params: { days } })).data.data
  },

  async previewAnnouncement(request: AnnouncementPreviewRequestDto): Promise<AnnouncementPreviewDto> {
    return (await http.post<ApiResponse<AnnouncementPreviewDto>>(`${ANNOUNCEMENTS}/preview`, request)).data.data
  },

  async getAnnouncementReach(kind: string, audience: AnnouncementAudienceDto): Promise<AnnouncementReachDto> {
    const params: Record<string, string | boolean> = { kind, email: audience.email, push: audience.push }
    if (audience.language) params.language = audience.language
    if (audience.countryId) params.countryId = audience.countryId
    if (audience.regionId) params.regionId = audience.regionId
    if (audience.role) params.role = audience.role
    return (await http.get<ApiResponse<AnnouncementReachDto>>(`${ANNOUNCEMENTS}/reach`, { params })).data.data
  },

  async testAnnouncement(request: AnnouncementRequestDto): Promise<AnnouncementReachDto> {
    return (await http.post<ApiResponse<AnnouncementReachDto>>(`${ANNOUNCEMENTS}/test`, request)).data.data
  },

  async sendAnnouncement(request: AnnouncementRequestDto): Promise<AnnouncementRecordDto> {
    return (await http.post<ApiResponse<AnnouncementRecordDto>>(ANNOUNCEMENTS, request)).data.data
  },

  async getAnnouncementHistory(): Promise<AnnouncementRecordDto[]> {
    return (await http.get<ApiResponse<AnnouncementRecordDto[]>>(ANNOUNCEMENTS)).data.data
  },

  /** One send or test with its results (#490); 404 `NOT_FOUND` when it does not exist. */
  async getAnnouncement(id: string): Promise<AnnouncementRecordDto> {
    return (await http.get<ApiResponse<AnnouncementRecordDto>>(`${ANNOUNCEMENTS}/${encodeURIComponent(id)}`)).data.data
  },
}
