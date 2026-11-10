/**
 * Notification preferences API client.
 * @architecture: Capa 4 — Infraestructura HTTP
 */
import { http } from "@/infrastructure/api/http";
import type { ApiResponseDto } from "@/infrastructure/api/dto/users.dto";
import type {
  EventAreaDto,
  NotificationPreferencesDto,
  PushOpenRequestDto,
  RegisterPushDeviceRequestDto,
  SetEventAreaRequestDto,
  UnregisterPushDeviceRequestDto,
  UpdateNotificationPreferencesRequestDto,
} from "@/infrastructure/api/dto/notifications.dto";

const PREFERENCES = "/users/me/notification-preferences";
const PUSH_DEVICES = "/users/me/push-devices";
const PUSH_OPENS = "/users/me/push-opens";
const EVENT_AREA = "/users/me/event-area";

export const notificationsApiClient = {
  getPreferences: (): Promise<NotificationPreferencesDto> =>
    http
      .get<ApiResponseDto<NotificationPreferencesDto>>(PREFERENCES)
      .then((response) => response.data.data),

  updatePreferences: (request: UpdateNotificationPreferencesRequestDto): Promise<NotificationPreferencesDto> =>
    http
      .put<ApiResponseDto<NotificationPreferencesDto>>(PREFERENCES, request)
      .then((response) => response.data.data),

  registerPushDevice: (request: RegisterPushDeviceRequestDto): Promise<void> =>
    http.put(PUSH_DEVICES, request).then(() => undefined),

  unregisterPushDevice: (request: UnregisterPushDeviceRequestDto): Promise<void> =>
    http.delete(PUSH_DEVICES, { data: request }).then(() => undefined),

  reportPushOpen: (request: PushOpenRequestDto): Promise<void> =>
    http.post(PUSH_OPENS, request).then(() => undefined),

  /** 204 means the user has no area. */
  getEventArea: (): Promise<EventAreaDto | null> =>
    http
      .get<EventAreaDto | "">(EVENT_AREA)
      .then((response) => (response.status === 204 || !response.data ? null : response.data)),

  setEventArea: (request: SetEventAreaRequestDto): Promise<void> =>
    http.put(EVENT_AREA, request).then(() => undefined),

  clearEventArea: (): Promise<void> => http.delete(EVENT_AREA).then(() => undefined),
};
