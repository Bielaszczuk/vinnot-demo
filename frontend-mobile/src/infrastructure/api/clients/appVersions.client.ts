/**
 * Public app version policy client. The endpoint needs no session, so a
 * missing or stale token never blocks it.
 * @architecture: Capa 4 — Infraestructura HTTP
 * @contract: GET /app-versions/minimum → ApiResponseWrapper<MinimumAppVersionsDto>
 */
import { http } from "@/infrastructure/api/http";
import type { ApiResponseDto } from "@/infrastructure/api/dto/users.dto";
import type { MinimumAppVersionsDto } from "@/infrastructure/api/dto/appVersions.dto";

/** A slow check must not hold the policy back; the app keeps working meanwhile. */
const POLICY_TIMEOUT_MS = 8_000;

export const appVersionsClient = {
  minimum: (): Promise<MinimumAppVersionsDto> =>
    http
      .get<ApiResponseDto<MinimumAppVersionsDto>>("/app-versions/minimum", { timeout: POLICY_TIMEOUT_MS })
      .then((response) => response.data.data),
};
