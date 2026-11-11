/**
 * Taste quiz service — the signed-in member's five illustrated questions that seed their taste profile.
 *
 * Flow: presentation hook → taste quiz service → taste quiz API client → HTTP.
 */
import { tasteQuizClient } from '@api/clients/tasteQuiz.client'
import { mapTasteQuiz } from '@domain/tasteQuiz/tasteQuiz.mappers'
import type { TasteQuiz, TasteQuizAnswers } from '@domain/tasteQuiz/tasteQuiz.types'

export const tasteQuizService = {
  async get(): Promise<TasteQuiz> {
    return mapTasteQuiz(await tasteQuizClient.get())
  },

  /** Saves the five answers; a retake replaces the previous ones. */
  async complete(answers: TasteQuizAnswers): Promise<void> {
    await tasteQuizClient.complete({ answers })
  },

  /** Records the skip so the quiz is not offered again; a completed quiz is kept. */
  async skip(): Promise<void> {
    await tasteQuizClient.skip()
  },
}
