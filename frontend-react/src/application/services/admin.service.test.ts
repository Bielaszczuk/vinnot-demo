import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminClient } from '@api/clients/admin.client'
import type { AdminWineSubmissionDto } from '@api/dto/admin.dto'
import { adminService } from './admin.service'

vi.mock('@api/clients/admin.client', () => ({
  adminClient: {
    uploadCatalogImage: vi.fn(), getWinery: vi.fn(), getStats: vi.fn(), getWines: vi.fn(), getWine: vi.fn(), createWine: vi.fn(),
    updateWine: vi.fn(), deleteWine: vi.fn(), getWineries: vi.fn(), createWinery: vi.fn(),
    updateWinery: vi.fn(), deleteWinery: vi.fn(), getEvents: vi.fn(), getEvent: vi.fn(),
    createEvent: vi.fn(), updateEvent: vi.fn(), deleteEvent: vi.fn(), getRoutes: vi.fn(),
    getRoute: vi.fn(), createRoute: vi.fn(), updateRoute: vi.fn(), deleteRoute: vi.fn(),
    getUsers: vi.fn(), updateUser: vi.fn(), updateUserRole: vi.fn(), banUser: vi.fn(), unbanUser: vi.fn(),
    deleteUser: vi.fn(), getReviews: vi.fn(), deleteReview: vi.fn(), getCountries: vi.fn(),
    getRegionsByCountry: vi.fn(), updateAiProfile: vi.fn(),
    getWineSubmissions: vi.fn(),
    getWineSubmission: vi.fn(),
    decideWineSubmission: vi.fn(),
    getWineSubmissionImage: vi.fn(),
  },
}))

const getWineSubmissions = vi.mocked(adminClient.getWineSubmissions)
const getWineSubmission = vi.mocked(adminClient.getWineSubmission)
const decideWineSubmission = vi.mocked(adminClient.decideWineSubmission)
const getWineSubmissionImage = vi.mocked(adminClient.getWineSubmissionImage)

const submissionDto: AdminWineSubmissionDto = {
  id: 'submission-1',
  submittedBy: 'user-1',
  wineName: 'Reserva',
  wineryName: 'Bodega Norte',
  grapes: null,
  imageAvailable: true,
  status: 'NEEDS_REVIEW',
  createdAt: '2026-08-10T10:00:00Z',
  updatedAt: '2026-08-10T10:00:00Z',
}

describe('adminService wine submissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps nullable transport fields to a stable domain model', async () => {
    getWineSubmissions.mockResolvedValueOnce({
      items: [submissionDto],
      totalItems: 1,
    })

    const result = await adminService.getWineSubmissions(
      0,
      20,
      'NEEDS_REVIEW',
      'reserva',
    )

    expect(getWineSubmissions).toHaveBeenCalledWith({
      page: 0,
      size: 20,
      status: 'NEEDS_REVIEW',
      search: 'reserva',
    })
    expect(result.items[0]).toMatchObject({
      submittedByUsername: null,
      grapes: [],
      wineType: null,
      imageUrl: null,
      reviewReason: null,
      status: 'NEEDS_REVIEW',
      wineryId: null,
      countryId: null,
      regionId: null,
      proposedGrapes: [],
    })
  })

  it('keeps the catalog references of a submission', async () => {
    getWineSubmission.mockResolvedValueOnce({
      ...submissionDto,
      grapes: ['Malbec', 'Uva Nueva'],
      wineryId: 'winery-1',
      countryId: 'country-1',
      regionId: null,
      proposedGrapes: ['Uva Nueva'],
    })

    expect(await adminService.getWineSubmission('submission-1')).toMatchObject({
      wineryId: 'winery-1',
      countryId: 'country-1',
      regionId: null,
      proposedGrapes: ['Uva Nueva'],
    })
  })

  it('loads detail, submits a decision and retrieves the private image through the adapter', async () => {
    getWineSubmission.mockResolvedValueOnce({ ...submissionDto, submittedByUsername: ' contributor ' })
    decideWineSubmission.mockResolvedValueOnce(undefined)
    const image = new Blob(['label'], { type: 'image/jpeg' })
    getWineSubmissionImage.mockResolvedValueOnce(image)

    const detail = await adminService.getWineSubmission('submission-1')
    expect(detail.submittedByUsername).toBe('contributor')
    await adminService.decideWineSubmission('submission-1', {
      decision: 'MERGE_EXISTING',
      reason: 'Existing catalog identity',
      targetWineId: 'wine-1',
    })
    const loadedImage = await adminService.getWineSubmissionImage('submission-1')

    expect(detail.id).toBe('submission-1')
    expect(decideWineSubmission).toHaveBeenCalledWith('submission-1', {
      decision: 'MERGE_EXISTING',
      reason: 'Existing catalog identity',
      targetWineId: 'wine-1',
    })
    expect(loadedImage).toBe(image)
  })

  it('uploads wine images before saving and stops on upload failure', async () => {
    vi.mocked(adminClient.updateWine).mockResolvedValue({ id: 'wine-1' } as never)
    vi.mocked(adminClient.uploadCatalogImage).mockResolvedValue('https://images.vinnot.com/wine.jpg')
    await adminService.updateWine('wine-1', { imageUrl: 'data:image/jpeg;base64,AA==' })
    expect(adminClient.updateWine).toHaveBeenLastCalledWith('wine-1', { imageUrl: 'https://images.vinnot.com/wine.jpg' })
    vi.mocked(adminClient.uploadCatalogImage).mockRejectedValueOnce(new Error('upload failed'))
    await expect(adminService.updateWine('wine-1', { imageUrl: 'data:image/jpeg;base64,AA==' })).rejects.toThrow('upload failed')
    expect(adminClient.updateWine).toHaveBeenCalledTimes(1)
  })

  it('orchestrates the complete administrative catalog surface', async () => {
    const item = { id: 'item-1', name: 'Item' } as never
    vi.mocked(adminClient.getStats).mockResolvedValue({ users: 1 } as never)
    vi.mocked(adminClient.getWines).mockResolvedValue({ items: [item], totalItems: 1 })
    vi.mocked(adminClient.getWine).mockResolvedValue(item)
    vi.mocked(adminClient.createWine).mockResolvedValue(item)
    vi.mocked(adminClient.updateWine).mockResolvedValue(item)
    vi.mocked(adminClient.getWinery).mockResolvedValue(item)
    vi.mocked(adminClient.getWineries).mockResolvedValue({ items: [item], totalItems: 1 })
    vi.mocked(adminClient.createWinery).mockResolvedValue(item)
    vi.mocked(adminClient.updateWinery).mockResolvedValue(item)
    vi.mocked(adminClient.getEvents).mockResolvedValue({ items: [item], totalItems: 1 })
    vi.mocked(adminClient.getEvent).mockResolvedValue(item)
    vi.mocked(adminClient.createEvent).mockResolvedValue(item)
    vi.mocked(adminClient.updateEvent).mockResolvedValue(item)
    vi.mocked(adminClient.getRoutes).mockResolvedValue({ items: [item], totalItems: 1 })
    vi.mocked(adminClient.getRoute).mockResolvedValue(item)
    vi.mocked(adminClient.createRoute).mockResolvedValue(item)
    vi.mocked(adminClient.updateRoute).mockResolvedValue(item)
    vi.mocked(adminClient.getUsers).mockResolvedValue({ items: [item], totalItems: 1 })
    vi.mocked(adminClient.getReviews).mockResolvedValue({ items: [item], totalItems: 1 })
    vi.mocked(adminClient.getCountries).mockResolvedValue([item])
    vi.mocked(adminClient.getRegionsByCountry).mockResolvedValue([item])

    await adminService.getStats()
    await adminService.getWines(0, 20, 'wine')
    await adminService.getWine('wine-1')
    await adminService.createWine(item)
    await adminService.updateWine('wine-1', item)
    await adminService.deleteWine('wine-1')
    await adminService.getWineries(0, 20, 'winery', 'Argentina', 'Mendoza')
    await adminService.getWinery('winery-1')
    await adminService.createWinery(item)
    await adminService.updateWinery('winery-1', item)
    await adminService.deleteWinery('winery-1')
    await adminService.getEvents(0, 20, 'event')
    await adminService.getEvent('event-1')
    await adminService.createEvent(item)
    await adminService.updateEvent('event-1', item)
    await adminService.deleteEvent('event-1')
    await adminService.getRoutes(0, 20, 'route')
    await adminService.getRoute('route-1')
    await adminService.createRoute(item)
    await adminService.updateRoute('route-1', item)
    await adminService.deleteRoute('route-1')
    await adminService.getUsers(0, 20, 'user')
    await adminService.updateUserRole('user-1', 'ROLE_ADMIN')
    await adminService.banUser('user-1', 'SPAM')
    await adminService.unbanUser('user-1')
    await adminService.deleteUser('user-1')
    await adminService.getReviews(0, 20, 'review')
    await adminService.deleteReview('review-1')
    await adminService.getCountries()
    await adminService.getRegionsByCountry('country-1')
    await adminService.updateAiProfile('wine-1', { body: 4 }, "en")
    await adminService.searchWineries('winery')

    expect(adminClient.getWineries).toHaveBeenLastCalledWith({ page: 0, size: 10, search: 'winery' })
    expect(adminClient.deleteEvent).toHaveBeenCalledWith('event-1', undefined)
  })

  it('sends the cancellation reason and keeps the note only for the other reason', async () => {
    await adminService.deleteEvent('event-1', { reason: 'OTHER', note: '  Private booking ' })
    expect(adminClient.deleteEvent).toHaveBeenLastCalledWith('event-1', { reason: 'OTHER', note: 'Private booking' })
    await adminService.deleteEvent('event-1', { reason: 'WEATHER', note: 'Storm' })
    expect(adminClient.deleteEvent).toHaveBeenLastCalledWith('event-1', { reason: 'WEATHER' })
  })

  it('sends both names of an account and skips the request when nothing changed', async () => {
    await adminService.updateUser('user-1', {})
    expect(adminClient.updateUser).not.toHaveBeenCalled()
    await adminService.updateUser('user-1', { firstName: 'Ana María', lastName: 'Pérez' })
    expect(adminClient.updateUser).toHaveBeenCalledWith('user-1', { firstName: 'Ana María', lastName: 'Pérez' })
  })

  it('bans with the reason code and shares the trimmed detail only with Other', async () => {
    await adminService.banUser('user-1', 'OTHER', '  Repeated fake events ')
    expect(adminClient.banUser).toHaveBeenLastCalledWith('user-1', 'OTHER', 'Repeated fake events')
    await adminService.banUser('user-1', 'FRAUD', 'Chargebacks')
    expect(adminClient.banUser).toHaveBeenLastCalledWith('user-1', 'FRAUD', undefined)
    await adminService.banUser('user-1', 'OTHER', '   ')
    expect(adminClient.banUser).toHaveBeenLastCalledWith('user-1', 'OTHER', undefined)
  })
})
