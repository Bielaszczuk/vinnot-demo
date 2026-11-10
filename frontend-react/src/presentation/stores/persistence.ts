import { STORAGE_KEYS } from '@config/constants'
import type { User } from '@domain/user/user.types'

type PersistedTheme = 'light' | 'dark' | 'system'

interface ZustandPersistEnvelope<T> {
  state?: T
}

type PersistedAuthPayload = {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
}

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function readPersisted<T>(key: string): Partial<T> | null {
  if (!isBrowser()) return null

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ZustandPersistEnvelope<T> | T
    if (parsed && typeof parsed === 'object' && 'state' in parsed && parsed.state) {
      return parsed.state as Partial<T>
    }
    return parsed as Partial<T>
  } catch {
    return null
  }
}

function writePersisted<T>(key: string, value: T): void {
  if (!isBrowser()) return
  const payload: ZustandPersistEnvelope<T> = { state: value }
  try {
    window.localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    // Storage may be unavailable or full. In-memory auth must still work, including logout.
    try { window.localStorage.removeItem(key) } catch { /* Browser denied storage access. */ }
  }
}

export function readPersistedAuth(): PersistedAuthPayload {
  const persisted = readPersisted<PersistedAuthPayload>(STORAGE_KEYS.AUTH_TOKEN)
  // Read once for cookie migration; no credentials or profile are persisted again.
  writePersistedAuth()
  return {
    accessToken: null,
    refreshToken: typeof persisted?.refreshToken === 'string' ? persisted.refreshToken : null,
    user: null,
  }
}

export function writePersistedAuth(): void {
  if (!isBrowser()) return
  try { window.localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN) }
  catch { /* Never fall back to writing credentials elsewhere. */ }
}

export function readPersistedTheme(): PersistedTheme {
  const persisted = readPersisted<{ theme?: PersistedTheme }>(STORAGE_KEYS.THEME)
  return persisted?.theme ?? 'system'
}

export function writePersistedTheme(theme: PersistedTheme): void {
  writePersisted(STORAGE_KEYS.THEME, { theme })
}
