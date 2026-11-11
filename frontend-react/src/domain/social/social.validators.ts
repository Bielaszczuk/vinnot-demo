/** Longest bio a profile accepts, matching the backend limit. */
export const BIO_MAX_LENGTH = 160

/** The bio as it is stored: trimmed; an empty bio clears it. */
export function normalizeBio(value: string): string {
  return value.trim()
}

export function isBioTooLong(value: string): boolean {
  return normalizeBio(value).length > BIO_MAX_LENGTH
}

/** Characters left for the counter; negative when the text is over the limit. */
export function bioRemaining(value: string): number {
  return BIO_MAX_LENGTH - value.length
}
