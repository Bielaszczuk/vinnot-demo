/**
 * Points service — the signed-in user's points, wax-seal tier and history.
 *
 * Flow: presentation hook → points service → users API client → HTTP.
 */
import { usersClient } from '@api/clients/users.client'
import { mapPointsSummaryFromDto } from '@domain/points/points.mappers'
import type { BadgeTier, PointsSummary } from '@domain/points/points.types'

export const pointsService = {
  async getMyPoints(): Promise<PointsSummary> {
    return mapPointsSummaryFromDto(await usersClient.getMyPoints())
  },

  /** Marks the tier (and any lower one) as celebrated, so its reveal plays only once. */
  async markCelebrated(tier: BadgeTier): Promise<void> {
    await usersClient.acknowledgePoints({ tier })
  },

  /** Dismisses the one-time "your seal is ready" card. */
  async dismissWelcome(): Promise<void> {
    await usersClient.acknowledgePoints({ welcome: true })
  },
}
