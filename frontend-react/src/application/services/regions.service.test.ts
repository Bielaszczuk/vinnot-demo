import { describe, expect, it, vi } from 'vitest'
import { regionsClient } from '@api/clients/regions.client'
import { regionsService } from './regions.service'

vi.mock('@api/clients/regions.client', () => ({
  regionsClient: {
    getRegions: vi.fn(), getCountries: vi.fn(), getRegionsByCountry: vi.fn(),
  },
}))

describe('regionsService', () => {
  it('maps country and region references and forwards country identity', async () => {
    const region = {
      id: 'mza', name: 'Mendoza', countryId: 'ar', countryCode: 'AR', countryName: 'Argentina',
    }
    vi.mocked(regionsClient.getRegions).mockResolvedValue([region])
    vi.mocked(regionsClient.getCountries).mockResolvedValue([
      { id: 'ar', code: 'AR', name: 'Argentina' },
    ])
    vi.mocked(regionsClient.getRegionsByCountry).mockResolvedValue([region])

    await expect(regionsService.getRegions()).resolves.toEqual([region])
    await expect(regionsService.getCountries()).resolves.toEqual([
      { id: 'ar', code: 'AR', name: 'Argentina' },
    ])
    await expect(regionsService.getRegionsByCountry('ar')).resolves.toEqual([region])
    expect(regionsClient.getRegionsByCountry).toHaveBeenCalledWith('ar')
  })
})
