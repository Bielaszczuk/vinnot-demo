import { beforeEach, describe, expect, it, vi } from 'vitest'

import http from '@infrastructure/http/http'
import { winesAiClient } from './wines.ai.client'

vi.mock('@infrastructure/http/http', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('winesAiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(http.post).mockResolvedValue({ data: {} } as never)
  })

  it('uses an AI-specific timeout for comparison and profile generation', async () => {
    await winesAiClient.compareWines('wine-a', 'wine-b', 'en')
    await winesAiClient.generateAiProfile('wine-a', 'en')
    await winesAiClient.regenerateAiProfile('wine-a', 'en')

    expect(http.post).toHaveBeenNthCalledWith(
      1,
      '/wines/compare',
      { wineAId: 'wine-a', wineBId: 'wine-b', language: 'en' },
      { timeout: 120_000 },
    )
    expect(http.post).toHaveBeenNthCalledWith(
      2,
      '/wines/wine-a/ai-profile',
      { language: 'en' },
      { timeout: 120_000 },
    )
    expect(http.post).toHaveBeenNthCalledWith(
      3,
      '/wines/wine-a/ai-profile/generate',
      undefined,
      { params: { language: 'en' }, timeout: 120_000 },
    )
  })
})
