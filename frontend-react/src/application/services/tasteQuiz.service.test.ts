import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tasteQuizClient } from '@api/clients/tasteQuiz.client'
import { tasteQuizService } from './tasteQuiz.service'

vi.mock('@api/clients/tasteQuiz.client', () => ({
  tasteQuizClient: { get: vi.fn(), complete: vi.fn(), skip: vi.fn() },
}))

const answers = {
  RAINY_DAY: 'SPICED_TEA_APPLE_TART',
  FRUIT: 'CITRUS',
  DESSERT: 'LEMON_TART',
  DINNER: 'LEMON_FISH',
  AROMA: 'CUT_GRASS',
} as const

describe('tasteQuizService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reads the own taste quiz into the domain model', async () => {
    vi.mocked(tasteQuizClient.get).mockResolvedValue({ status: 'PENDING', answers: null, shouldPrompt: true })
    await expect(tasteQuizService.get()).resolves.toEqual({ status: 'PENDING', answers: null, shouldPrompt: true })
  })

  it('sends the five answers to complete the quiz', async () => {
    vi.mocked(tasteQuizClient.complete).mockResolvedValue(undefined)
    await tasteQuizService.complete(answers)
    expect(tasteQuizClient.complete).toHaveBeenCalledWith({ answers })
  })

  it('records that the member skipped the quiz', async () => {
    vi.mocked(tasteQuizClient.skip).mockResolvedValue(undefined)
    await tasteQuizService.skip()
    expect(tasteQuizClient.skip).toHaveBeenCalledOnce()
  })
})
