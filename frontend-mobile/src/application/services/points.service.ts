/**
 * Points Service: the current user's points, tier and celebrations.
 * @architecture: Capa 3 — Aplicación
 */
import { pointsApiClient } from "@/infrastructure/api/clients/points.client";
import { mapPointsSummary } from "@/domain/points/points.mappers";
import type { PointsSummary } from "@/domain/points/points.types";
import type { BadgeTier } from "@/domain/points/badgeTiers";

export const pointsService = {
  async getMine(): Promise<PointsSummary> {
    return mapPointsSummary(await pointsApiClient.getMine());
  },

  /** Marks the tier, and every lower one, as celebrated on every device. */
  async markCelebrated(tier: BadgeTier): Promise<void> {
    await pointsApiClient.celebrate({ tier });
  },

  async dismissWelcome(): Promise<void> {
    await pointsApiClient.celebrate({ welcome: true });
  },
};
