import { describe, expect, it, vi } from 'vitest'
import { grapeTypesClient } from '@api/clients/grapeTypes.client'
import { grapeTypesService } from './grapeTypes.service'

vi.mock('@api/clients/grapeTypes.client', () => ({
  grapeTypesClient: { getGrapeTypes: vi.fn() },
}))

describe('grapeTypesService', () => {
  it('projects transport data into grape identities', async () => {
    vi.mocked(grapeTypesClient.getGrapeTypes).mockResolvedValue([
      { id: 'malbec', name: 'Malbec', ignored: true },
    ] as never)

    await expect(grapeTypesService.getGrapeTypes()).resolves.toEqual([
      { id: 'malbec', name: 'Malbec' },
    ])
  })
})
