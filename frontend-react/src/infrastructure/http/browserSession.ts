/** Serializes cookie mutations across tabs without broadcasting or persisting credentials. */
const lockName = 'vinnot-browser-session'
const eventKey = 'vinnot-session-event'
const logoutKey = 'vinnot-logout-pending'
type SessionEvent = 'signed-in' | 'signed-out'
let queue: Promise<unknown> = Promise.resolve()
let pendingLogout = false

export function exclusiveSession<T>(operation: () => Promise<T>): Promise<T> {
  const run = async () => {
    if (typeof navigator === 'undefined' || !navigator.locks) return operation()
    let entered = false
    try {
      return await navigator.locks.request(lockName, () => {
        entered = true
        return operation()
      })
    } catch (error) {
      // Blocking site storage can deny the Locks API even when it is present.
      // Only fall back before the operation starts; never repeat a session mutation.
      if (!entered && error instanceof DOMException && error.name === 'SecurityError') return operation()
      throw error
    }
  }
  const result = queue.then(run, run)
  queue = result.catch(() => undefined)
  return result
}

export function isLogoutPending(): boolean {
  try { return pendingLogout || window.localStorage.getItem(logoutKey) === '1' }
  catch { return pendingLogout }
}

export function setLogoutPending(pending: boolean): void {
  pendingLogout = pending
  try {
    if (pending) window.localStorage.setItem(logoutKey, '1')
    else window.localStorage.removeItem(logoutKey)
  } catch { /* Memory fallback when storage is unavailable. */ }
}

export function notifySession(event: SessionEvent): void {
  try {
    window.localStorage.setItem(eventKey, JSON.stringify({ event, nonce: crypto.randomUUID() }))
  } catch { /* Session remains usable when browser storage is disabled. */ }
}

export function subscribeSession(listener: (event: SessionEvent) => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== eventKey || !event.newValue) return
    try {
      const value = JSON.parse(event.newValue) as { event?: unknown }
      if (value.event === 'signed-in' || value.event === 'signed-out') {
        pendingLogout = value.event === 'signed-out'
        listener(value.event)
      }
    } catch { /* Ignore malformed non-credential notifications. */ }
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}
