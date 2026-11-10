import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usersClient } from '@api/clients/users.client'
import { pointsService } from './points.service'

vi.mock('@api/clients/users.client', () => ({
  usersClient: { getMyPoints: vi.fn(), acknowledgePoints: vi.fn() },
}))

describe('pointsService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps the points summary into the domain model', async () => {
    vi.mocked(usersClient.getMyPoints).mockResolvedValue({
      points: 85, tier: 'RACIMO', nextTier: 'VENDIMIA', nextTierAt: 160, tierFloor: 80,
      todayEarned: 3, dailyCap: 40, pendingCelebration: 'RACIMO', showWelcome: false,
      recent: [{ id: 'e1', source: 'REVIEW', points: 3, createdAt: '2026-10-27T12:00:00Z', label: 'Malbec' }],
    })
    const summary = await pointsService.getMyPoints()
    expect(summary.tier).toBe('RACIMO')
    expect(summary.pendingCelebration).toBe('RACIMO')
    expect(summary.recent[0]).toEqual({ id: 'e1', source: 'REVIEW', points: 3, createdAt: new Date('2026-10-27T12:00:00Z'), label: 'Malbec' })
  })

  it('marks a tier as celebrated and dismisses the welcome card', async () => {
    vi.mocked(usersClient.acknowledgePoints).mockResolvedValue(undefined)
    await pointsService.markCelebrated('GRAN_RESERVA')
    await pointsService.dismissWelcome()
    expect(usersClient.acknowledgePoints).toHaveBeenNthCalledWith(1, { tier: 'GRAN_RESERVA' })
    expect(usersClient.acknowledgePoints).toHaveBeenNthCalledWith(2, { welcome: true })
  })
})
