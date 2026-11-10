import { http, HttpResponse, delay } from 'msw'
import { getRandomLatency } from '../config'
import { API_BASE, paginate, users } from '../mockState'

/** Mock points summary for `dev:mock`: a Reserva seal with a few movements. */
const mockPoints = {
  points: 1372,
  tier: 'RESERVA',
  nextTier: 'GRAN_RESERVA',
  nextTierAt: 1600,
  tierFloor: 1000,
  todayEarned: 6,
  dailyCap: 40,
  pendingCelebration: null as string | null,
  showWelcome: false,
  recent: [
    { id: 'mock-points-1', source: 'REVIEW', points: 3, createdAt: '2026-10-27T12:00:00Z', label: 'Malbec Reserva' },
    { id: 'mock-points-2', source: 'REVIEW_NOTE', points: 2, createdAt: '2026-10-27T12:00:00Z', label: 'Malbec Reserva' },
    { id: 'mock-points-3', source: 'LIKE_RECEIVED', points: 1, createdAt: '2026-10-26T18:30:00Z', label: 'Torrontés' },
  ],
}

export const userHandlers = [
  http.get(`${API_BASE}/users/me/points`, async () => {
    await delay(getRandomLatency())
    return HttpResponse.json({ data: mockPoints })
  }),

  http.post(`${API_BASE}/users/me/points/celebrations`, async () => {
    await delay(getRandomLatency())
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API_BASE}/users`, async ({ request }) => {
    await delay(getRandomLatency())

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('page_size') || '20')

    return HttpResponse.json(paginate(users, page, pageSize))
  }),

  http.get(`${API_BASE}/users/:id`, async ({ params }) => {
    await delay(getRandomLatency())

    const { id } = params
    const user = users.find((item) => item.id === id)

    if (!user) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 },
      )
    }

    return HttpResponse.json({ data: user })
  }),
]
