/**
 * Remembers, for this browser session, that a member was already taken to the taste quiz, so it never
 * interrupts them twice. Across sessions the server status (SKIPPED or COMPLETED) prevents the prompt.
 * Blocked storage falls back to memory for the life of the page.
 */
const prefix = 'vinnot.taste-quiz-prompted.v1:'
const remembered = new Set<string>()

export const tasteQuizPromptSession = {
  wasPrompted(userId: string): boolean {
    try {
      if (window.sessionStorage.getItem(prefix + userId) === '1') return true
    } catch {
      /* Fall back to memory. */
    }
    return remembered.has(userId)
  },
  markPrompted(userId: string): void {
    try {
      window.sessionStorage.setItem(prefix + userId, '1')
    } catch {
      remembered.add(userId)
    }
  },
}
