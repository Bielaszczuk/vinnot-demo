/** Accept only application-relative destinations, including encoded forms. */
export function internalReturnPath(value: unknown): string {
  if (typeof value !== 'string' || value.length > 4096) return '/'
  let decoded = value
  for (let depth = 0; depth < 5; depth += 1) {
    if (!decoded.startsWith('/') || decoded.startsWith('//')
      || [...decoded].some((character) => character === '\\' || character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return '/'
    try {
      const next = decodeURIComponent(decoded)
      if (next === decoded) return value
      decoded = next
    } catch {
      return '/'
    }
  }
  return '/'
}

const AUTH_GATE = /^\/(login|register|complete-profile|forgot-password|reset-password|verify-email|confirm-email-change)(\/|$)/i

/** Authentication pages are never a destination after signing in. */
export function isAuthGatePath(pathname: string): boolean {
  return AUTH_GATE.test(pathname)
}

/** Query that brings the person back to `path` after authentication; empty for home or unsafe paths. */
export function returnSearchFor(path: string): string {
  const target = internalReturnPath(path)
  return target === '/' ? '' : `?returnUrl=${encodeURIComponent(target)}`
}
