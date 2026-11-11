/**
 * Taste Quiz Service — reads, completes and skips the member's own taste quiz.
 * @architecture: Capa 3 — Aplicación
 */
import { tasteQuizApiClient } from "@/infrastructure/api/clients/tasteQuiz.client";
import { mapTasteQuizState } from "@/domain/tasteQuiz/tasteQuiz.mappers";
import type { TasteQuizAnswers, TasteQuizState } from "@/domain/tasteQuiz/tasteQuiz.types";

export const tasteQuizService = {
  async get(): Promise<TasteQuizState> {
    return mapTasteQuizState(await tasteQuizApiClient.get());
  },

  /** Saves the five answers; a retake overwrites the previous ones. */
  complete(answers: TasteQuizAnswers): Promise<void> {
    return tasteQuizApiClient.complete(answers);
  },

  /** Never prompts again; a completed quiz is kept. */
  skip(): Promise<void> {
    return tasteQuizApiClient.skip();
  },
};
