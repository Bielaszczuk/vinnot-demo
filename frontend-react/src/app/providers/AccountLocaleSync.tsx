import { useAccountLocaleSync } from '@hooks/useAccountLocaleSync'

/** Renders nothing; keeps the signed-in account's language and time zone current. */
export function AccountLocaleSync() {
  useAccountLocaleSync()
  return null
}
