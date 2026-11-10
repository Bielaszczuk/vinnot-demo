import { http, HttpResponse, delay } from 'msw'
import { getRandomLatency } from '../config'
import { API_BASE, events, paginate } from '../mockState'

export const eventHandlers = [
  http.get(`${API_BASE}/events`, async ({ request }) => {
    await delay(getRandomLatency())

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('page_size') || '20')
    const search = url.searchParams.get('search')?.toLowerCase()
    const type = url.searchParams.get('type')
    const city = url.searchParams.get('city')
    const latitude = url.searchParams.get('latitude')
    const longitude = url.searchParams.get('longitude')
    const radiusKm = parseFloat(url.searchParams.get('radius_km') || '50')

    let filteredEvents = [...events]

    if (search) {
      filteredEvents = filteredEvents.filter((event) =>
        event.title.toLowerCase().includes(search) ||
        event.description.toLowerCase().includes(search),
      )
    }
    if (type) {
      const types = type.split(',')
      filteredEvents = filteredEvents.filter((event) => types.includes(event.type))
    }
    if (city) {
      filteredEvents = filteredEvents.filter((event) => event.location.city.toLowerCase() === city.toLowerCase())
    }

    if (latitude && longitude) {
      const lat = parseFloat(latitude)
      const lon = parseFloat(longitude)
      filteredEvents = filteredEvents.filter((event) => {
        if (!event.location.latitude || !event.location.longitude) return true
        const distance = Math.sqrt(
          Math.pow(event.location.latitude - lat, 2) + Math.pow(event.location.longitude - lon, 2),
        ) * 111
        return distance <= radiusKm
      })
    }

    return HttpResponse.json(paginate(filteredEvents, page, pageSize))
  }),

  http.get(`${API_BASE}/events/:id`, async ({ params }) => {
    await delay(getRandomLatency())

    const { id } = params
    const event = events.find((item) => item.id === id)

    if (!event) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Event not found' } },
        { status: 404 },
      )
    }

    return HttpResponse.json({ data: event })
  }),
]
