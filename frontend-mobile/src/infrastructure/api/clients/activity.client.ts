/**
 * Engagement signals API client: detail views and app opens of the signed-in user.
 * @architecture: Capa 4 — Infraestructura HTTP
 */
import { http } from "@/infrastructure/api/http";
import type { ActivityViewRequestDto } from "@/infrastructure/api/dto/activity.dto";

const VIEWS = "/users/me/activity/views";
const APP_OPEN = "/users/me/activity/app-open";

export const activityApiClient = {
  recordView: (request: ActivityViewRequestDto): Promise<void> => http.post(VIEWS, request).then(() => undefined),

  recordAppOpen: (): Promise<void> => http.post(APP_OPEN, {}).then(() => undefined),
};
