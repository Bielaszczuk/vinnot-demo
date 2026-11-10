import { expect, it, vi } from 'vitest'
import { referenceDataClient } from '@api/clients/referenceData.client'
import { referenceDataService } from './referenceData.service'

vi.mock('@api/clients/referenceData.client', () => ({ referenceDataClient: { getWineTypes: vi.fn() } }))

it('reads the wine types from the reference catalog', async () => {
  vi.mocked(referenceDataClient.getWineTypes).mockResolvedValue([
    { code: 'ORANGE', nameEs: 'Naranja', nameEn: 'Orange' },
  ])
  await expect(referenceDataService.getWineTypes()).resolves.toEqual([
    { code: 'ORANGE', value: 'orange', names: { es: 'Naranja', en: 'Orange' } },
  ])
})
