import { http, HttpResponse, delay } from 'msw'
import { getRandomLatency, shouldFail } from '../config'
import {
  API_BASE,
  aiProfiles,
  comparisons,
  paginate,
  reviews,
  wines,
  type WineFixture,
} from '../mockState'

export const wineHandlers = [
  http.get(`${API_BASE}/wines`, async ({ request }) => {
    await delay(getRandomLatency())

    if (shouldFail('wines')) {
      return HttpResponse.json(
        { error: { code: 'SERVER_ERROR', message: 'Failed to fetch wines' } },
        { status: 500 },
      )
    }

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('page_size') || '20')
    const search = url.searchParams.get('search')?.toLowerCase()
    const type = url.searchParams.get('type')
    const region = url.searchParams.get('region')
    const minPrice = url.searchParams.get('min_price')
    const maxPrice = url.searchParams.get('max_price')
    const minRating = url.searchParams.get('min_rating')

    let filteredWines = [...wines]

    if (search) {
      filteredWines = filteredWines.filter((wine) =>
        wine.name.toLowerCase().includes(search) ||
        wine.winery.toLowerCase().includes(search) ||
        wine.region.toLowerCase().includes(search),
      )
    }
    if (type) {
      const types = type.split(',')
      filteredWines = filteredWines.filter((wine) => types.includes(wine.type))
    }
    if (region) {
      filteredWines = filteredWines.filter((wine) => wine.region.toLowerCase() === region.toLowerCase())
    }
    if (minPrice) {
      filteredWines = filteredWines.filter((wine) => wine.price >= parseFloat(minPrice))
    }
    if (maxPrice) {
      filteredWines = filteredWines.filter((wine) => wine.price <= parseFloat(maxPrice))
    }
    if (minRating) {
      filteredWines = filteredWines.filter((wine) => wine.rating >= parseFloat(minRating))
    }

    return HttpResponse.json(paginate(filteredWines, page, pageSize))
  }),

  http.get(`${API_BASE}/wines/:id`, async ({ params }) => {
    await delay(getRandomLatency())

    const wineId = String(params.id ?? '')
    const wine = wines.find((item) => item.id === wineId)

    if (!wine) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Wine not found' } },
        { status: 404 },
      )
    }

    return HttpResponse.json({ data: wine })
  }),

  http.get(`${API_BASE}/wines/:id/reviews`, async ({ params, request }) => {
    await delay(getRandomLatency())

    const wineId = String(params.id ?? '')
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('page_size') || '10')

    return HttpResponse.json(paginate(reviews[wineId] || [], page, pageSize))
  }),

  http.get(`${API_BASE}/wines/:id/similar`, async ({ params, request }) => {
    await delay(getRandomLatency())

    const { id } = params
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '5')

    const wine = wines.find((item) => item.id === id)
    if (!wine) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Wine not found' } },
        { status: 404 },
      )
    }

    const similar = wines
      .filter((item) => item.id !== id && item.type === wine.type)
      .slice(0, limit)

    return HttpResponse.json({ data: similar })
  }),

  http.get(`${API_BASE}/wines/recommended`, async ({ request }) => {
    await delay(getRandomLatency())

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const recommended = [...wines].sort((a, b) => b.rating - a.rating).slice(0, limit)

    return HttpResponse.json({ data: recommended })
  }),

  http.get(`${API_BASE}/wines/popular`, async ({ request }) => {
    await delay(getRandomLatency())

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const popular = [...wines].sort((a, b) => b.review_count - a.review_count).slice(0, limit)

    return HttpResponse.json({ data: popular })
  }),

  http.post(`${API_BASE}/wines/compare`, async ({ request }) => {
    await delay(getRandomLatency() + 500)

    const body = await request.json() as { wine_ids: string[] }
    const { wine_ids } = body
    const cacheKey = wine_ids.sort().join('_')

    if (comparisons[cacheKey]) {
      const cached = comparisons[cacheKey]
      const comparedWines = wine_ids
        .map((id) => wines.find((wine) => wine.id === id))
        .filter((wine): wine is WineFixture => Boolean(wine))

      return HttpResponse.json({
        data: {
          wines: comparedWines,
          comparison: cached.comparison,
          ai_summary: cached.ai_summary,
        },
      })
    }

    const comparedWines = wine_ids
      .map((id) => wines.find((wine) => wine.id === id))
      .filter((wine): wine is WineFixture => Boolean(wine))

    if (comparedWines.length < 2) {
      return HttpResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Need at least 2 wines to compare' } },
        { status: 400 },
      )
    }

    const comparison = [
      { attribute: 'Price', values: comparedWines.map((wine) => wine.price), winner_index: comparedWines.reduce((min, wine, index, list) => (wine.price < list[min]!.price ? index : min), 0) },
      { attribute: 'Rating', values: comparedWines.map((wine) => wine.rating), winner_index: comparedWines.reduce((max, wine, index, list) => (wine.rating > list[max]!.rating ? index : max), 0) },
      { attribute: 'Reviews', values: comparedWines.map((wine) => wine.review_count), winner_index: comparedWines.reduce((max, wine, index, list) => (wine.review_count > list[max]!.review_count ? index : max), 0) },
      { attribute: 'Alcohol', values: comparedWines.map((wine) => wine.alcohol_content), winner_index: null },
      { attribute: 'Type', values: comparedWines.map((wine) => wine.type), winner_index: null },
    ]

    return HttpResponse.json({
      data: {
        wines: comparedWines,
        comparison,
        ai_summary: `Comparing ${comparedWines.map((wine) => wine.name).join(' vs ')}. Each wine has its unique characteristics suited for different occasions.`,
      },
    })
  }),

  http.get(`${API_BASE}/wines/:id/ai-profile`, async ({ params }) => {
    await delay(getRandomLatency() + 1000)

    const wineId = String(params.id ?? '')

    if (aiProfiles[wineId]) {
      return HttpResponse.json({ data: aiProfiles[wineId] })
    }

    const wine = wines.find((item) => item.id === wineId)
    if (!wine) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Wine not found' } },
        { status: 404 },
      )
    }

    const profile = {
      wine_id: wineId,
      summary: `${wine.name} is a ${wine.type} wine from ${wine.region}, ${wine.country}. ${wine.description}`,
      ideal_occasions: ['Dinner parties', 'Special celebrations', 'Quiet evenings'],
      food_pairings_detailed: (wine.food_pairings || []).map((dish: string, index: number) => ({
        dish,
        category: 'Food',
        match_score: 90 - index * 5,
        reason: `Complements the wine's ${wine.type} characteristics.`,
      })),
      similar_wines: wines.filter((item) => item.id !== wineId && item.type === wine.type).slice(0, 3).map((item) => item.name),
      personality_traits: ['Elegant', 'Complex', 'Balanced'],
      generated_at: new Date().toISOString(),
    }

    return HttpResponse.json({ data: profile })
  }),
]
