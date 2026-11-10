import { beforeEach, describe, expect, it, vi } from 'vitest'
import { winesClient } from '@api/clients/wines.client'
import { HttpError } from '@infrastructure/http/errors'
import { ReviewStateConflictError, winesService } from './wines.service'

vi.mock('@api/clients/wines.client', () => ({
  winesClient: {
    getWines: vi.fn(), getWine: vi.fn(), getSimilarWines: vi.fn(),
    getRecommendedWines: vi.fn(), getPopularWines: vi.fn(), createWine: vi.fn(),
    updateWine: vi.fn(), deleteWine: vi.fn(), getWineReviews: vi.fn(),
    createWineReview: vi.fn(),
    updateWineReview: vi.fn(),
    deleteWineReview: vi.fn(), markReviewHelpful: vi.fn(), unmarkReviewHelpful: vi.fn(),
    getMyReviewStatus: vi.fn(), getReviewComments: vi.fn(), addReviewComment: vi.fn(),
    deleteReviewComment: vi.fn(), compareWines: vi.fn(), getAiProfile: vi.fn(),
    getAiProfileStatus: vi.fn(), generateAiProfile: vi.fn(), regenerateAiProfile: vi.fn(), scanWineLabel: vi.fn(),
    addToFavorites: vi.fn(), removeFromFavorites: vi.fn(), getFavoriteWines: vi.fn(),
  },
}))

vi.mock('@domain/wine/wine.mappers', () => ({
  mapWineFromDto: vi.fn((value) => value),
  mapWineSummaryFromDto: vi.fn((value) => value),
  mapWineReviewFromDto: vi.fn((value) => value),
  mapWineComparisonFromDto: vi.fn((value) => value),
  mapAiProfileFromDto: vi.fn((value) => value),
  mapWineScanResultFromDto: vi.fn((value) => value),
  mapWineReviewCommentFromDto: vi.fn((value) => value),
  mapWineToDto: vi.fn((value) => value),
}))

const createWineReview = vi.mocked(winesClient.createWineReview)
const updateWineReview = vi.mocked(winesClient.updateWineReview)

describe('winesService review errors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ['create', 409],
    ['create', 422],
    ['update', 409],
    ['update', 422],
  ] as const)('maps a %s review HTTP %s response to a domain-facing conflict', async (operation, status) => {
    const transportError = new HttpError(status, 'REVIEW_STATE_CONFLICT', 'Review conflict')

    if (operation === 'create') {
      createWineReview.mockRejectedValueOnce(transportError)

      await expect(winesService.addReview('wine-id', 4)).rejects.toBeInstanceOf(
        ReviewStateConflictError,
      )
      return
    }

    updateWineReview.mockRejectedValueOnce(transportError)

    await expect(
      winesService.updateReview('wine-id', 'review-id', 4),
    ).rejects.toBeInstanceOf(ReviewStateConflictError)
  })

  it('preserves unrelated infrastructure failures', async () => {
    const transportError = new HttpError(503, 'SERVICE_UNAVAILABLE', 'Service unavailable')
    createWineReview.mockRejectedValueOnce(transportError)

    await expect(winesService.addReview('wine-id', 4)).rejects.toBe(transportError)

    updateWineReview.mockRejectedValueOnce(transportError)
    await expect(winesService.updateReview('wine-id', 'review-id', 4))
      .rejects.toBe(transportError)
  })

  it('orchestrates catalog, CRUD and recommendation operations', async () => {
    const dto = { id: 'wine-1' } as never
    vi.mocked(winesClient.getWines).mockResolvedValue({ items: [dto], pageNumber: 0, pageSize: 20, totalItems: 1, totalPages: 1 } as never)
    vi.mocked(winesClient.getWine).mockResolvedValue(dto)
    vi.mocked(winesClient.getSimilarWines).mockResolvedValue([dto])
    vi.mocked(winesClient.getRecommendedWines).mockResolvedValue([dto])
    vi.mocked(winesClient.getPopularWines).mockResolvedValue([dto])
    vi.mocked(winesClient.createWine).mockResolvedValue(dto)
    vi.mocked(winesClient.updateWine).mockResolvedValue(dto)

    await expect(winesService.getWines({ search: 'malbec' })).resolves.toMatchObject({ wines: [dto] })
    await winesService.getWine('wine-1')
    await winesService.getSimilarWines('wine-1')
    await winesService.getRecommendedWines()
    await winesService.getPopularWines()
    await winesService.createWine({} as never)
    await winesService.updateWine('wine-1', { name: 'Reserva' })
    await winesService.deleteWine('wine-1')

    expect(winesClient.deleteWine).toHaveBeenCalledWith('wine-1')
  })

  it('orchestrates the complete review workflow', async () => {
    const dto = { id: 'review-1' } as never
    vi.mocked(winesClient.getWineReviews).mockResolvedValue({ items: [dto], totalItems: 1, totalPages: 1 } as never)
    createWineReview.mockResolvedValue(dto)
    updateWineReview.mockResolvedValue(dto)
    vi.mocked(winesClient.getMyReviewStatus).mockResolvedValue({ hasReview: true })
    vi.mocked(winesClient.getReviewComments).mockResolvedValue([dto])
    vi.mocked(winesClient.addReviewComment).mockResolvedValue(dto)

    await expect(winesService.getWineReviews('wine-1')).resolves.toMatchObject({ reviews: [dto] })
    await winesService.addReview('wine-1', 5, 'Excelente', 'Texto')
    await winesService.updateReview('wine-1', 'review-1', 4, 'Muy bueno', 'Texto')
    await winesService.deleteReview('wine-1', 'review-1')
    await winesService.markReviewHelpful('wine-1', 'review-1')
    await winesService.unmarkReviewHelpful('wine-1', 'review-1')
    await expect(winesService.getMyReviewStatus('wine-1')).resolves.toEqual({ hasReview: true })
    await winesService.getReviewComments('wine-1', 'review-1')
    await winesService.addReviewComment('wine-1', 'review-1', 'Gracias')
    await winesService.deleteReviewComment('wine-1', 'review-1', 'comment-1')
  })

  it('sends the tasted vintage on create only when one is chosen', async () => {
    createWineReview.mockResolvedValue({ id: 'review-1' } as never)

    await winesService.addReview('wine-1', 5, 'Excelente', 'Texto', 2018)
    expect(createWineReview).toHaveBeenLastCalledWith('wine-1', {
      rating: 5, title: 'Excelente', comment: 'Texto', vintage: 2018,
    })

    await winesService.addReview('wine-1', 5, 'Excelente', 'Texto', null)
    expect(createWineReview).toHaveBeenLastCalledWith('wine-1', { rating: 5, title: 'Excelente', comment: 'Texto' })

    await winesService.addReview('wine-1', 5, 'Excelente', 'Texto')
    expect(createWineReview).toHaveBeenLastCalledWith('wine-1', { rating: 5, title: 'Excelente', comment: 'Texto' })
  })

  it('sends a vintage, a clear, or no vintage field on update', async () => {
    updateWineReview.mockResolvedValue({ id: 'review-1' } as never)

    await winesService.updateReview('wine-1', 'review-1', 4, 'Muy bueno', 'Texto', 2019)
    expect(updateWineReview).toHaveBeenLastCalledWith('wine-1', 'review-1', {
      rating: 4, title: 'Muy bueno', comment: 'Texto', vintage: 2019,
    })

    await winesService.updateReview('wine-1', 'review-1', 4, 'Muy bueno', 'Texto', null)
    expect(updateWineReview).toHaveBeenLastCalledWith('wine-1', 'review-1', {
      rating: 4, title: 'Muy bueno', comment: 'Texto', clearVintage: true,
    })

    await winesService.updateReview('wine-1', 'review-1', 4, 'Muy bueno', 'Texto')
    expect(updateWineReview).toHaveBeenLastCalledWith('wine-1', 'review-1', {
      rating: 4, title: 'Muy bueno', comment: 'Texto',
    })
  })

  it('orchestrates AI, comparison, scanning and favorites', async () => {
    const dto = { id: 'result-1' } as never
    vi.mocked(winesClient.compareWines).mockResolvedValue(dto)
    vi.mocked(winesClient.getAiProfile).mockResolvedValue(dto)
    vi.mocked(winesClient.getAiProfileStatus).mockResolvedValue({ status: 'READY' } as never)
    vi.mocked(winesClient.generateAiProfile).mockResolvedValue(dto)
    vi.mocked(winesClient.regenerateAiProfile).mockResolvedValue(dto)
    vi.mocked(winesClient.scanWineLabel).mockResolvedValue(dto)
    vi.mocked(winesClient.getFavoriteWines).mockResolvedValue({ data: [dto], pagination: { page: 1, size: 20, totalElements: 1, totalPages: 1 } } as never)

    await winesService.compareWines('wine-a', 'wine-b')
    await winesService.getAiProfile('wine-1')
    await expect(winesService.getAiProfileStatus('wine-1')).resolves.toMatchObject({ status: 'READY', generatedAt: null })
    await winesService.generateAiProfile('wine-1')
    await winesService.regenerateAiProfile('wine-1')
    await winesService.scanWineLabel('file:///label.jpg')
    await winesService.addToFavorites('wine-1')
    await winesService.removeFromFavorites('wine-1')
    await expect(winesService.getFavoriteWines()).resolves.toMatchObject({ wines: [dto] })

    expect(winesClient.generateAiProfile).toHaveBeenCalledWith('wine-1', 'es')
    expect(winesClient.regenerateAiProfile).toHaveBeenCalledWith('wine-1', 'es')
  })

  it('reads a missing AI profile as "no profile yet" and keeps other failures', async () => {
    vi.mocked(winesClient.getAiProfile).mockRejectedValueOnce(new HttpError(404, 'HTTP_404', 'Request failed with status code 404'))
    await expect(winesService.getAiProfile('wine-1', 'en')).resolves.toBeNull()
    vi.mocked(winesClient.getAiProfile).mockRejectedValueOnce(new HttpError(500, 'INTERNAL', 'boom'))
    await expect(winesService.getAiProfile('wine-1', 'en')).rejects.toMatchObject({ status: 500 })
  })
})
