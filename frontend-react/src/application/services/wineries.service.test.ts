import { beforeEach, describe, expect, it, vi } from 'vitest'
import { wineriesClient } from '@api/clients/wineries.client'
import { winesClient } from '@api/clients/wines.client'
import { mapWineryFromDto, mapWinerySummaryFromDto } from '@domain/winery/winery.mappers'
import { mapWineSummaryFromDto } from '@domain/wine/wine.mappers'
import { wineriesService } from './wineries.service'

vi.mock('@api/clients/wineries.client', () => ({
  wineriesClient: { getWineries: vi.fn(), getWinery: vi.fn(), updateCoordinates: vi.fn() },
}))
vi.mock('@api/clients/wines.client', () => ({ winesClient: { getWines: vi.fn() } }))
vi.mock('@domain/winery/winery.mappers', () => ({
  mapWineryFromDto: vi.fn(), mapWinerySummaryFromDto: vi.fn(),
}))
vi.mock('@domain/wine/wine.mappers', () => ({ mapWineSummaryFromDto: vi.fn() }))

describe('wineriesService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps winery pages and derives navigation flags', async () => {
    vi.mocked(wineriesClient.getWineries).mockResolvedValue({
      content: [{ id: 'winery-1' }], page: 1, size: 10, totalElements: 21, totalPages: 3,
    } as never)
    vi.mocked(mapWinerySummaryFromDto).mockReturnValue({ id: 'winery-1' } as never)

    const result = await wineriesService.getWineries({ search: 'andes' }, 1, 10)

    expect(result.pagination).toMatchObject({ hasNext: true, hasPrevious: true })
    expect(wineriesClient.getWineries).toHaveBeenCalledWith(expect.objectContaining({
      search: 'andes', page: 1, size: 10,
    }))
  })

  it('maps winery wines and normalizes coordinate addresses', async () => {
    vi.mocked(winesClient.getWines).mockResolvedValue({
      items: [{ id: 'wine-1' }], pageNumber: 0, pageSize: 5,
      totalItems: '1', totalPages: 1, hasNext: false, hasPrevious: false,
    } as never)
    vi.mocked(mapWineSummaryFromDto).mockReturnValue({ id: 'wine-1' } as never)

    const result = await wineriesService.getWineryWines('winery-1', 0, 5)
    await wineriesService.updateWineryCoordinates('winery-1', -32.9, -68.8)

    expect(result.pagination.totalItems).toBe(1)
    expect(wineriesClient.updateCoordinates).toHaveBeenCalledWith('winery-1', {
      latitude: -32.9, longitude: -68.8, address: null,
    })
  })

  it('maps winery detail and preserves an explicit geocoded address', async () => {
    vi.mocked(wineriesClient.getWinery).mockResolvedValue({ id: 'winery-1' } as never)
    vi.mocked(mapWineryFromDto).mockReturnValue({ id: 'winery-1' } as never)

    await expect(wineriesService.getWinery('winery-1')).resolves.toEqual({ id: 'winery-1' })
    await wineriesService.updateWineryCoordinates('winery-1', -32.9, -68.8, 'Mendoza')
    expect(wineriesClient.updateCoordinates).toHaveBeenLastCalledWith('winery-1', {
      latitude: -32.9, longitude: -68.8, address: 'Mendoza',
    })
  })
})
