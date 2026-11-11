import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tasteTraitsClient } from '@api/clients/tasteTraits.client'
import { tasteTraitsService } from './tasteTraits.service'

vi.mock('@api/clients/tasteTraits.client', () => ({
  tasteTraitsClient: { adjust: vi.fn(), reset: vi.fn() },
}))

describe('tasteTraitsService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends only the given structure changes', async () => {
    vi.mocked(tasteTraitsClient.adjust).mockResolvedValue(undefined)
    await tasteTraitsService.adjustStructure({ TANNIN: 65, BODY: null })
    expect(tasteTraitsClient.adjust).toHaveBeenCalledWith({ structure: { TANNIN: 65, BODY: null } })
  })

  it('goes back to the calculated structure by clearing every adjustment', async () => {
    vi.mocked(tasteTraitsClient.reset).mockResolvedValue(undefined)
    await tasteTraitsService.resetStructure()
    expect(tasteTraitsClient.reset).toHaveBeenCalledOnce()
  })
})
