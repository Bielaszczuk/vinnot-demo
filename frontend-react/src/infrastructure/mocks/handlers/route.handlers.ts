import { http, HttpResponse, delay } from 'msw'
import { getRandomLatency } from '../config'
import { API_BASE, paginate, routes } from '../mockState'

export const routeHandlers = [
  http.get(`${API_BASE}/wine-routes`, async ({ request }) => {
    await delay(getRandomLatency())

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('page_size') || '20')
    const search = url.searchParams.get('search')?.toLowerCase()
    const region = url.searchParams.get('region')
    const difficulty = url.searchParams.get('difficulty')

    let filteredRoutes = [...routes]

    if (search) {
      filteredRoutes = filteredRoutes.filter((route) =>
        route.name.toLowerCase().includes(search) ||
        route.description.toLowerCase().includes(search),
      )
    }
    if (region) {
      filteredRoutes = filteredRoutes.filter((route) => route.region.toLowerCase() === region.toLowerCase())
    }
    if (difficulty) {
      const difficulties = difficulty.split(',')
      filteredRoutes = filteredRoutes.filter((route) => difficulties.includes(route.difficulty))
    }

    return HttpResponse.json(paginate(filteredRoutes, page, pageSize))
  }),

  http.get(`${API_BASE}/wine-routes/:id`, async ({ params }) => {
    await delay(getRandomLatency())

    const { id } = params
    const route = routes.find((item) => item.id === id)

    if (!route) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Route not found' } },
        { status: 404 },
      )
    }

    return HttpResponse.json({ data: route })
  }),
]
