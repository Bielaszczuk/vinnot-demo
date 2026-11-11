/**
 * Taste Quiz API Client — the signed-in member's own taste quiz.
 * @architecture: Capa 4 — Infraestructura HTTP
 * @contract: issue #541, S10.
 */
import { http } from "@/infrastructure/api/http";
import type { ApiResponseDto } from "@/infrastructure/api/dto/users.dto";
import type { TasteQuizAnswersRequestDto, TasteQuizDto } from "@/infrastructure/api/dto/tasteQuiz.dto";

const TASTE_QUIZ_PATH = "/users/me/taste-quiz";

export const tasteQuizApiClient = {
  get: (): Promise<TasteQuizDto> =>
    http.get<ApiResponseDto<TasteQuizDto>>(TASTE_QUIZ_PATH).then((response) => response.data.data),

  complete: (answers: TasteQuizAnswersRequestDto["answers"]): Promise<void> =>
    http.put(TASTE_QUIZ_PATH, { answers } satisfies TasteQuizAnswersRequestDto).then(() => undefined),

  skip: (): Promise<void> => http.post(`${TASTE_QUIZ_PATH}/skip`).then(() => undefined),
};
