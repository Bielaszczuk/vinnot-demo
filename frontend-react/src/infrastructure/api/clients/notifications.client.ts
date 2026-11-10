import http from '@infrastructure/http/http'
import { API_ENDPOINTS } from '@config/constants'
import type { ApiResponse } from '@api/api.types'
import type {
  EventAreaDto,
  NotificationPreferencesDto,
  SetEventAreaRequestDto,
  UnsubscribeResponseDto,
  UpdateNotificationPreferencesRequestDto,
} from '@api/dto/notifications.dto'

const PREFERENCES = `${API_ENDPOINTS.USERS}/me/notification-preferences`
const EVENT_AREA = `${API_ENDPOINTS.USERS}/me/event-area`

export const notificationsClient = {
  async getPreferences(): Promise<NotificationPreferencesDto> {
    return (await http.get<ApiResponse<NotificationPreferencesDto>>(PREFERENCES)).data.data
  },

  async updatePreferences(request: UpdateNotificationPreferencesRequestDto): Promise<NotificationPreferencesDto> {
    return (await http.put<ApiResponse<NotificationPreferencesDto>>(PREFERENCES, request)).data.data
  },

  /** Null when the user has no area (204). The body is a plain object, not an ApiResponse. */
  async getEventArea(): Promise<EventAreaDto | null> {
    const response = await http.get<EventAreaDto | ''>(EVENT_AREA)
    return response.status === 204 || !response.data ? null : response.data
  },

  async setEventArea(request: SetEventAreaRequestDto): Promise<void> {
    await http.put(EVENT_AREA, request)
  },

  async clearEventArea(): Promise<void> {
    await http.delete(EVENT_AREA)
  },

  /** Public: the signed token is the only credential, so no session is needed. */
  async unsubscribe(token: string): Promise<UnsubscribeResponseDto> {
    return (await http.post<ApiResponse<UnsubscribeResponseDto>>('/notifications/unsubscribe', null, {
      params: { token },
    })).data.data
  },
}
