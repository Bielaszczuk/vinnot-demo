import { beforeEach, describe, expect, it, vi } from 'vitest'
import { wineRoutesClient } from '@api/clients/wineRoutes.client'
import { mapWineRouteFromDto, mapWineRouteSummaryFromDto } from '@domain/route/route.mappers'
import { wineRoutesService } from './wineRoutes.service'

vi.mock('@api/clients/wineRoutes.client', () => ({
  wineRoutesClient: {
    getHierarchy: vi.fn(), getCountries: vi.fn(), getRegions: vi.fn(),
    getSubregions: vi.fn(), getWineRoutes: vi.fn(), getWineRoute: vi.fn(),
  },
}))

vi.mock('@domain/route/route.mappers', () => ({
  mapWineRouteFromDto: vi.fn(), mapWineRouteSummaryFromDto: vi.fn(),
}))

describe('wineRoutesService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('normalizes route page variants and forwards filters', async () => {
    vi.mocked(wineRoutesClient.getWineRoutes).mockResolvedValue({
      content: [{ id: 'route-1' }], pageNumber: 2, pageSize: 5,
      totalItems: 11, totalPages: 3, first: false, last: true,
    } as never)
    vi.mocked(mapWineRouteSummaryFromDto).mockReturnValue({ id: 'route-1' } as never)

    const result = await wineRoutesService.getWineRoutes({
      search: 'andes', country: 'Argentina',
    }, 2, 5)

    expect(wineRoutesClient.getWineRoutes).toHaveBeenCalledWith(expect.objectContaining({
      search: 'andes', country: 'Argentina', page: 2, size: 5,
    }))
    expect(result.pagination).toMatchObject({ hasNext: false, hasPrevious: true })
  })

  it('sends the difficulty filter with the backend enum value', async () => {
    vi.mocked(wineRoutesClient.getWineRoutes).mockResolvedValue({ content: [] } as never)
    await wineRoutesService.getWineRoutes({ search: 'uco', difficulty: 'medium', country: 'Argentina', region: 'Mendoza' }, 0, 20)
    expect(wineRoutesClient.getWineRoutes).toHaveBeenLastCalledWith({
      page: 0, size: 20, search: 'uco', country: 'Argentina', region: 'Mendoza', subregion: undefined, difficulty: 'MEDIUM',
    })
    await wineRoutesService.getWineRoutes({ difficulty: ['long', 'short'] }, 0, 20)
    expect(wineRoutesClient.getWineRoutes).toHaveBeenLastCalledWith(expect.objectContaining({ difficulty: 'LONG' }))
  })

  it('sends no difficulty when none is chosen', async () => {
    vi.mocked(wineRoutesClient.getWineRoutes).mockResolvedValue({ content: [] } as never)
    await wineRoutesService.getWineRoutes({ search: 'uco' }, 0, 20)
    expect(wineRoutesClient.getWineRoutes).toHaveBeenLastCalledWith(expect.objectContaining({ difficulty: undefined }))
  })

  it('maps route details', async () => {
    vi.mocked(wineRoutesClient.getWineRoute).mockResolvedValue({ id: 'route-1' } as never)
    vi.mocked(mapWineRouteFromDto).mockReturnValue({ id: 'route-1' } as never)

    await expect(wineRoutesService.getWineRoute('route-1')).resolves.toEqual({ id: 'route-1' })
  })

  it('maps hierarchy and delegates geographic catalogs', async () => {
    vi.mocked(wineRoutesClient.getHierarchy).mockResolvedValue({
      countries: [{ name: 'Argentina', regions: [{ name: 'Mendoza', subregions: ['Valle de Uco'] }] }],
    })
    vi.mocked(wineRoutesClient.getCountries).mockResolvedValue(['Argentina'])
    vi.mocked(wineRoutesClient.getRegions).mockResolvedValue(['Mendoza'])
    vi.mocked(wineRoutesClient.getSubregions).mockResolvedValue(['Valle de Uco'])

    await expect(wineRoutesService.getHierarchy()).resolves.toEqual({
      countries: [{ name: 'Argentina', regions: [{ name: 'Mendoza', subregions: ['Valle de Uco'] }] }],
    })
    await expect(wineRoutesService.getCountries()).resolves.toEqual(['Argentina'])
    await expect(wineRoutesService.getRegions('Argentina')).resolves.toEqual(['Mendoza'])
    await expect(wineRoutesService.getSubregions('Argentina', 'Mendoza')).resolves.toEqual(['Valle de Uco'])
  })

  it('uses pagination defaults for sparse backend responses', async () => {
    vi.mocked(wineRoutesClient.getWineRoutes).mockResolvedValue({ content: [] } as never)
    await expect(wineRoutesService.getWineRoutes(undefined, 0, 20)).resolves.toMatchObject({
      pagination: { pageNumber: 0, pageSize: 20, totalItems: 0, totalPages: 0 },
    })
  })
})
