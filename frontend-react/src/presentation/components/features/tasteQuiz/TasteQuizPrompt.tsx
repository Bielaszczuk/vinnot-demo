import { useTasteQuizPrompt } from '@hooks/useTasteQuizPrompt'

/** Renders nothing: offers the taste quiz once after sign-in. Mounted by the app shell. */
export function TasteQuizPrompt({ disabled = false }: { disabled?: boolean }) {
  useTasteQuizPrompt(disabled)
  return null
}
