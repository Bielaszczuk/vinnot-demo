/**
 * Mounted once in the signed-in app shell, inside the terms gate: it only runs once the
 * agreement is accepted, never over the verify-email or force-update screens.
 */
import { useTasteQuizPrompt } from "./useTasteQuizPrompt";

export function TasteQuizPromptHost() {
  useTasteQuizPrompt();
  return null;
}
