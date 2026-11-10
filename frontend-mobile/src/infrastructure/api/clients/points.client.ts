/**
 * Points API Client.
 * @architecture: Capa 4 — Infraestructura HTTP
 */
import { http } from "@/infrastructure/api/http";
import type { ApiResponseDto } from "@/infrastructure/api/dto/users.dto";
import type { PointsCelebrationRequestDto, PointsSummaryDto } from "@/infrastructure/api/dto/points.dto";

function unwrap(body: ApiResponseDto<PointsSummaryDto> | PointsSummaryDto): PointsSummaryDto {
  return "data" in body && body.data && typeof body.data === "object" ? body.data : (body as PointsSummaryDto);
}

export const pointsApiClient = {
  getMine: (): Promise<PointsSummaryDto> =>
    http
      .get<ApiResponseDto<PointsSummaryDto> | PointsSummaryDto>("/users/me/points")
      .then((response) => unwrap(response.data)),

  celebrate: (request: PointsCelebrationRequestDto): Promise<void> =>
    http.post("/users/me/points/celebrations", request).then(() => undefined),
};
