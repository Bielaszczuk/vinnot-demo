import { http, HttpResponse, delay } from 'msw'
import { browserAuthHandlers } from './browserAuth.handlers'
import { getMockConfig, getRandomLatency, shouldFail, shouldRefreshFail } from '../config'
import {
  API_BASE,
  credentials,
  generateToken,
  removeToken,
  users,
  validateToken,
} from '../mockState'

export const authHandlers = [
  ...browserAuthHandlers,
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    await delay(getRandomLatency())

    if (shouldFail('auth/login')) {
      return HttpResponse.json(
        { error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
        { status: 500 },
      )
    }

    const body = await request.json() as { email: string; password: string }
    const { email, password } = body

    if (credentials[email] !== password) {
      return HttpResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 },
      )
    }

    const user = users.find((item) => item.email === email)
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 },
      )
    }

    const accessToken = generateToken(user.id)
    const refreshToken = `refresh-${generateToken(user.id)}`

    return HttpResponse.json({
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: getMockConfig().auth.tokenExpiryMs / 1000,
        token_type: 'Bearer',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          roles: user.roles,
          is_verified: user.is_verified,
        },
      },
    })
  }),

  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    await delay(getRandomLatency())

    const body = await request.json() as { email: string; password: string; name: string }
    const { email, name } = body

    if (users.find((item) => item.email === email)) {
      return HttpResponse.json(
        { error: { code: 'EMAIL_EXISTS', message: 'Email already registered' } },
        { status: 409 },
      )
    }

    const newUser = {
      id: `user-${Date.now()}`,
      email,
      name,
      avatar: null,
      roles: ['ROLE_USER'],
      is_verified: false,
      preferences: {
        favorite_wine_types: [],
        favorite_regions: [],
        price_range: null,
        notifications: { email: true, push: false, events: true, recommendations: true, newsletter: false },
        locale: 'es-AR',
        theme: 'system',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    users.push(newUser)

    const accessToken = generateToken(newUser.id)
    const refreshToken = `refresh-${generateToken(newUser.id)}`

    return HttpResponse.json({
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: getMockConfig().auth.tokenExpiryMs / 1000,
        token_type: 'Bearer',
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          avatar: newUser.avatar,
          roles: newUser.roles,
          is_verified: newUser.is_verified,
        },
      },
    })
  }),

  http.post(`${API_BASE}/auth/refresh`, async ({ request }) => {
    await delay(getRandomLatency())

    if (shouldRefreshFail()) {
      return HttpResponse.json(
        { error: { code: 'TOKEN_EXPIRED', message: 'Refresh token expired' } },
        { status: 401 },
      )
    }

    const body = await request.json() as { refresh_token: string }
    const tokenPart = body.refresh_token.replace('refresh-', '')
    const userId = validateToken(tokenPart)

    if (!userId) {
      return HttpResponse.json(
        { error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' } },
        { status: 401 },
      )
    }

    return HttpResponse.json({
      data: {
        access_token: generateToken(userId),
        expires_in: getMockConfig().auth.tokenExpiryMs / 1000,
      },
    })
  }),

  http.post(`${API_BASE}/auth/logout`, async ({ request }) => {
    await delay(getRandomLatency())

    const authHeader = request.headers.get('Authorization')
    if (authHeader) {
      removeToken(authHeader.replace('Bearer ', ''))
    }

    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API_BASE}/auth/me`, async ({ request }) => {
    await delay(getRandomLatency())

    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'No token provided' } },
        { status: 401 },
      )
    }

    const userId = validateToken(authHeader.replace('Bearer ', ''))
    if (!userId) {
      return HttpResponse.json(
        { error: { code: 'TOKEN_EXPIRED', message: 'Token expired' } },
        { status: 401 },
      )
    }

    const user = users.find((item) => item.id === userId)
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 },
      )
    }

    return HttpResponse.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        roles: user.roles,
        is_verified: user.is_verified,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    })
  }),
]
