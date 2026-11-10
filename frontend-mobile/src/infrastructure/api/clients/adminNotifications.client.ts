/**
 * Admin notifications API client (#310, mobile #327). Switch changes, tests and sends need a fresh
 * reauthentication: the HTTP transport asks for it and retries on its own.
 * @architecture: Capa 4 — Infraestructura HTTP
 */
import { http } from "@/infrastructure/api/http";
import type { ApiResponseDto } from "@/infrastructure/api/dto/users.dto";
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
} from "@/infrastructure/api/dto/adminNotifications.dto";

const PUSH = "/admin/notifications/push";
const ANNOUNCEMENTS = "/admin/notifications/announcements";

export const adminNotificationsClient = {
  getPushSettings: (): Promise<PushSettingsDto> =>
    http.get<ApiResponseDto<PushSettingsDto>>(PUSH).then((response) => response.data.data),

  setPushTypeEnabled: (type: string, enabled: boolean): Promise<PushSettingsDto> =>
    http
      .put<ApiResponseDto<PushSettingsDto>>(`${PUSH}/types/${encodeURIComponent(type)}`, { enabled })
      .then((response) => response.data.data),

  getPushMetrics: (days: number): Promise<PushMetricsDto> =>
    http
      .get<ApiResponseDto<PushMetricsDto>>(`${PUSH}/metrics`, { params: { days } })
      .then((response) => response.data.data),

  getPushEngagement: (days: number): Promise<PushEngagementDto> =>
    http
      .get<ApiResponseDto<PushEngagementDto>>(`${PUSH}/engagement`, { params: { days } })
      .then((response) => response.data.data),

  previewAnnouncement: (request: AnnouncementPreviewRequestDto): Promise<AnnouncementPreviewDto> =>
    http
      .post<ApiResponseDto<AnnouncementPreviewDto>>(`${ANNOUNCEMENTS}/preview`, request)
      .then((response) => response.data.data),

  getAnnouncementReach: (kind: string, audience: AnnouncementAudienceDto): Promise<AnnouncementReachDto> => {
    const params: Record<string, string | boolean> = { kind, email: audience.email, push: audience.push };
    if (audience.language) params.language = audience.language;
    if (audience.countryId) params.countryId = audience.countryId;
    if (audience.regionId) params.regionId = audience.regionId;
    if (audience.role) params.role = audience.role;
    return http
      .get<ApiResponseDto<AnnouncementReachDto>>(`${ANNOUNCEMENTS}/reach`, { params })
      .then((response) => response.data.data);
  },

  testAnnouncement: (request: AnnouncementRequestDto): Promise<AnnouncementReachDto> =>
    http
      .post<ApiResponseDto<AnnouncementReachDto>>(`${ANNOUNCEMENTS}/test`, request)
      .then((response) => response.data.data),

  sendAnnouncement: (request: AnnouncementRequestDto): Promise<AnnouncementRecordDto> =>
    http
      .post<ApiResponseDto<AnnouncementRecordDto>>(ANNOUNCEMENTS, request)
      .then((response) => response.data.data),

  getAnnouncementHistory: (): Promise<AnnouncementRecordDto[]> =>
    http.get<ApiResponseDto<AnnouncementRecordDto[]>>(ANNOUNCEMENTS).then((response) => response.data.data),

  /** One send or test with its delivery counts; a missing one answers 404 `NOT_FOUND`. */
  getAnnouncement: (id: string): Promise<AnnouncementRecordDto> =>
    http
      .get<ApiResponseDto<AnnouncementRecordDto>>(`${ANNOUNCEMENTS}/${encodeURIComponent(id)}`)
      .then((response) => response.data.data),
};
