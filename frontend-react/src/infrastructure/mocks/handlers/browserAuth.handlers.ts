import { http, HttpResponse } from 'msw'
import { API_BASE, credentials, generateToken, users, validateToken } from '../mockState'

// Development fixtures emulate browser-session restoration in memory, not cookie security.
let sessionUserId: string | undefined
function identity(user: typeof users[number]) {
  return { id: user.id, username: user.email.split('@')[0], email: user.email, name: user.name,
    avatarUrl: user.avatar, roles: user.roles, emailVerified: user.is_verified, onboardingCompleted: true,
    createdAt: user.created_at, updatedAt: user.updated_at }
}
function session() {
  if (!sessionUserId) return new HttpResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
  const user = users.find(value => value.id === sessionUserId)
  return user ? HttpResponse.json({ accessToken: generateToken(user.id), tokenType: 'Bearer',
    expiresIn: 900000, user: identity(user) }) : HttpResponse.json({ code: 'INVALID_TOKEN' }, { status: 422 })
}
export const browserAuthHandlers = [
  http.post(`${API_BASE}/auth/web/login`, async ({ request }) => {
    const input = await request.json() as { usernameOrEmail: string; password: string }
    const user = users.find(value => value.email === input.usernameOrEmail)
    if (!user || credentials[user.email] !== input.password) return HttpResponse.json({ code: 'AUTH_FAILED' }, { status: 401 })
    sessionUserId = user.id
    return session()
  }),
  http.post(`${API_BASE}/auth/web/refresh`, () => session()),
  http.post(`${API_BASE}/auth/web/logout`, () => { sessionUserId = undefined; return new HttpResponse(null, { status: 204 }) }),
  http.get(`${API_BASE}/auth/me`, ({ request }) => {
    const userId = validateToken(request.headers.get('Authorization')?.replace('Bearer ', '') ?? '')
    const user = users.find(value => value.id === userId)
    return user ? HttpResponse.json(identity(user)) : HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 })
  }),
]
