import http from '@infrastructure/http/http'
import { API_ENDPOINTS } from '@config/constants'
import type { ApiResponse } from '@api/api.types'
import type { CompleteTasteQuizRequestDto, TasteQuizDto } from '@api/dto/tasteQuiz.dto'

const TASTE_QUIZ = `${API_ENDPOINTS.USERS}/me/taste-quiz`

/**
 * Taste quiz API client: the signed-in member's quiz status, answers and skip.
 */
export const tasteQuizClient = {
  async get(): Promise<TasteQuizDto> {
    const response = await http.get<ApiResponse<TasteQuizDto>>(TASTE_QUIZ)
    return response.data.data
  },

  /** 204; 400 INVALID_TASTE_QUIZ on a missing or unknown question or option. A retake overwrites. */
  async complete(data: CompleteTasteQuizRequestDto): Promise<void> {
    await http.put(TASTE_QUIZ, data)
  },

  /** 204; never erases a completed quiz. */
  async skip(): Promise<void> {
    await http.post(`${TASTE_QUIZ}/skip`)
  },
}
