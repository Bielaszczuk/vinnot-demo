/** Logs a swallowed best-effort failure while developing; release builds stay silent. */
export function devWarn(message: string, error?: unknown): void {
  if (__DEV__) console.warn(message, error);
}
