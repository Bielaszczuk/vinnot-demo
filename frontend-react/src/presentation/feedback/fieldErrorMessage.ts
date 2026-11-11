import type { TFunction } from 'i18next'

/** Form errors carry i18n keys (from the domain schemas or server field errors); translate them where they are shown. */
export function fieldErrorMessage(t: TFunction, error: { message?: string } | undefined): string | undefined {
  return error?.message ? t(error.message) : undefined
}
