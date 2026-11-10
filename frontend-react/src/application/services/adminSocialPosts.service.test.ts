import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@infrastructure/http/errors'
import { LEGAL_LINES, draftFromCopy } from '@domain/admin/socialPost'
import { adminSocialPostsService, isLastRotatingPillar, isPublishingOff, isSocialPostConflict, scheduleActionError } from './adminSocialPosts.service'

const client = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  plan: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  update: vi.fn(),
  regenerate: vi.fn(),
  newIllustration: vi.fn(),
  getWineDays: vi.fn(),
  getPillars: vi.fn(),
  retryPublication: vi.fn(),
  setPillarAutoApprove: vi.fn(),
  setPillarActive: vi.fn(),
  reschedule: vi.fn(),
  publishNow: vi.fn(),
}))
vi.mock('@/infrastructure/api/clients/adminSocialPosts.client', () => ({ adminSocialPostsClient: client }))

const copy = {
  hook: 'Tres datos sobre el Malbec',
  slides: [{ title: 'Origen', body: 'Cahors.' }, { title: 'Llegada', body: '1853.' }, { title: 'Hoy', body: 'Mendoza.' }],
  caption: `Datos. ${LEGAL_LINES.es}`,
  hashtags: ['#vinnot', '#malbec', '#vino', '#mendoza', '#dato'],
  altText: 'Carrusel.',
  cta: '¿Cuál te sorprendió?',
}
const english = {
  hook: 'Three facts about Malbec',
  slides: [{ title: 'Origin', body: 'Cahors.' }, { title: 'Arrival', body: '1853.' }, { title: 'Today', body: 'Mendoza.' }],
  caption: `Facts. ${LEGAL_LINES.en}`,
  hashtags: ['#vinnot', '#malbec', '#wine', '#mendoza', '#winefacts'],
  altText: 'Carousel.',
  cta: 'Which one surprised you?',
}

const dto = {
  id: 'p1', status: 'PENDING_APPROVAL', scheduledFor: '2026-11-03T22:00:00Z',
  pillar: { code: 'CURIOUS_FACT', nameEs: 'Dato curioso', nameEn: 'Curious fact', weight: 2 },
  wineDay: { code: 'MERLOT', nameEs: 'Día del Merlot', nameEn: 'Merlot Day', date: '2026-11-07' },
  copies: { es: copy, en: english },
  generation: { provider: 'openai', model: 'gpt-4o-mini', mock: false, attempts: 2, generatedAt: '2026-11-02T12:00:00Z', factCheck: 'FLAGGED', factCheckIssues: ['1853 es discutido'], error: null },
  review: { reviewedBy: 'admin@vinnot.test', reviewedAt: '2026-11-02T13:00:00Z', reason: null, editedBy: null },
  createdAt: '2026-11-02T12:00:00Z', updatedAt: '2026-11-02T13:00:00Z',
}

describe('admin social posts service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps a full post and leaves out statuses this build cannot read', async () => {
    client.list.mockResolvedValue({ items: [dto, { ...dto, id: 'p2', status: 'ARCHIVED' }], totalItems: 2 })

    await expect(adminSocialPostsService.getPosts(0, 20, 'PENDING_APPROVAL')).resolves.toEqual({
      items: [{
        id: 'p1', status: 'PENDING_APPROVAL', scheduledFor: '2026-11-03T22:00:00Z',
        pillar: { code: 'CURIOUS_FACT', nameEs: 'Dato curioso', nameEn: 'Curious fact', weight: 2 },
        wineDay: { code: 'MERLOT', nameEs: 'Día del Merlot', nameEn: 'Merlot Day', date: '2026-11-07' },
        copies: { es: { ...copy, illustration: null }, en: { ...english, illustration: null } },
        generation: { provider: 'openai', model: 'gpt-4o-mini', mock: false, attempts: 2, generatedAt: '2026-11-02T12:00:00Z', factCheck: 'FLAGGED', issues: ['1853 es discutido'], error: null },
        review: { reviewedBy: 'admin@vinnot.test', reviewedAt: '2026-11-02T13:00:00Z', reason: null, editedBy: null, automatic: false },
        media: null,
        publishing: null,
        publications: [],
        canReschedule: false,
        canPublishNow: false,
        networkSchedule: [],
        createdAt: '2026-11-02T12:00:00Z', updatedAt: '2026-11-02T13:00:00Z',
      }],
      totalItems: 2,
    })
    expect(client.list).toHaveBeenCalledWith({ page: 0, size: 20, status: 'PENDING_APPROVAL' })
  })

  it('fills the optional parts of a bare draft with safe defaults', async () => {
    client.get.mockResolvedValue({
      ...dto, status: 'DRAFT', pillar: { code: 'QUIZ', nameEs: 'Quiz', nameEn: 'Quiz' }, wineDay: null, copies: { es: null, en: null },
      generation: { factCheck: 'UNKNOWN', error: 'provider down' }, review: null,
    })

    const post = await adminSocialPostsService.getPost('p1')
    expect(post.pillar).toEqual({ code: 'QUIZ', nameEs: 'Quiz', nameEn: 'Quiz', weight: 0 })
    expect(post.wineDay).toBeNull()
    expect(post.copies).toEqual({ es: null, en: null })
    expect(post.review).toBeNull()
    expect(post.generation).toEqual({ provider: null, model: null, mock: false, attempts: 0, generatedAt: null, factCheck: null, issues: [], error: 'provider down' })

    client.get.mockResolvedValue({ ...dto, pillar: null, generation: null, review: {} })
    const bare = await adminSocialPostsService.getPost('p1')
    expect(bare.pillar).toBeNull()
    expect(bare.generation.mock).toBe(false)
    expect(bare.review).toEqual({ reviewedBy: null, reviewedAt: null, reason: null, editedBy: null, automatic: false })
  })

  it('maps a post that still misses one language, and treats absent copies as both pending', async () => {
    client.get.mockResolvedValue({ ...dto, copies: { es: copy, en: null } })
    expect((await adminSocialPostsService.getPost('p1')).copies).toEqual({ es: { ...copy, illustration: null }, en: null })

    client.get.mockResolvedValue({ ...dto, copies: { es: null } })
    expect((await adminSocialPostsService.getPost('p1')).copies).toEqual({ es: null, en: null })

    client.get.mockResolvedValue({ ...dto, copies: undefined })
    expect((await adminSocialPostsService.getPost('p1')).copies).toEqual({ es: null, en: null })
  })

  it('shows who reviewed and edited a post by email, and the account id when the email is unknown', async () => {
    client.get.mockResolvedValue({
      ...dto,
      review: { reviewedBy: 'u-1', reviewedByEmail: 'ana@vinnot.com', reviewedAt: null, reason: null, editedBy: 'u-2', editedByEmail: null },
    })

    expect((await adminSocialPostsService.getPost('p1')).review).toEqual({
      reviewedBy: 'ana@vinnot.com', reviewedAt: null, reason: null, editedBy: 'u-2', automatic: false,
    })
  })

  it('maps the illustration subject and the rendered media of each language and format', async () => {
    client.get.mockResolvedValue({
      ...dto,
      copies: { es: { ...copy, illustration: 'a bunch of Merlot grapes' }, en: { ...english, illustration: 'a bunch of Merlot grapes' } },
      media: {
        status: 'READY', source: 'AI', error: null, illustrationReason: null, heroUrl: '/api/uploads/social/hero.png',
        slides: {
          es: { instagram: ['/api/uploads/social/es-ig-1.jpg', '/api/uploads/social/es-ig-2.jpg'], tiktok: ['https://images.vinnot.com/es-tt-1.jpg'], renderedFor: 'abc123' },
          en: { instagram: ['/api/uploads/social/en-ig-1.jpg'], tiktok: ['/api/uploads/social/en-tt-1.jpg'], renderedFor: 'def456' },
        },
        updatedAt: '2026-11-02T14:00:00Z',
      },
    })

    const post = await adminSocialPostsService.getPost('p1')
    expect(post.copies.es?.illustration).toBe('a bunch of Merlot grapes')
    expect(post.copies.en?.hook).toBe('Three facts about Malbec')
    expect(post.media).toEqual({
      status: 'READY', source: 'AI', illustrationReason: null, heroUrl: '/api/uploads/social/hero.png',
      slides: {
        es: { INSTAGRAM: ['/api/uploads/social/es-ig-1.jpg', '/api/uploads/social/es-ig-2.jpg'], TIKTOK: ['https://images.vinnot.com/es-tt-1.jpg'], renderedFor: 'abc123' },
        en: { INSTAGRAM: ['/api/uploads/social/en-ig-1.jpg'], TIKTOK: ['/api/uploads/social/en-tt-1.jpg'], renderedFor: 'def456' },
      },
      updatedAt: '2026-11-02T14:00:00Z',
    })
  })

  it('leaves a language without rendered slides as null and fills the missing formats of a set', async () => {
    client.get.mockResolvedValue({
      ...dto,
      media: { status: 'PENDING', slides: { es: { instagram: ['ig.jpg'], tiktok: null, renderedFor: null }, en: null } },
    })
    expect((await adminSocialPostsService.getPost('p1')).media?.slides).toEqual({
      es: { INSTAGRAM: ['ig.jpg'], TIKTOK: [], renderedFor: null }, en: null,
    })
  })

  it('keeps the render error of failed media, fills missing parts and drops media this build cannot read', async () => {
    client.get.mockResolvedValue({ ...dto, media: { status: 'FAILED', source: 'FALLBACK', error: 'TEXT_DOES_NOT_FIT', illustrationReason: 'AI_IMAGE_UNAVAILABLE' } })
    expect((await adminSocialPostsService.getPost('p1')).media).toEqual({
      status: 'FAILED', error: 'TEXT_DOES_NOT_FIT', source: 'FALLBACK', illustrationReason: 'AI_IMAGE_UNAVAILABLE', heroUrl: null,
      slides: { es: null, en: null }, updatedAt: null,
    })

    client.get.mockResolvedValue({ ...dto, media: { status: 'FAILED', source: 'SOMETHING' } })
    expect((await adminSocialPostsService.getPost('p1')).media).toMatchObject({ status: 'FAILED', error: null, source: null })

    client.get.mockResolvedValue({ ...dto, media: { status: 'PENDING', slides: null } })
    expect((await adminSocialPostsService.getPost('p1')).media).toMatchObject({ status: 'PENDING', slides: { es: null, en: null } })
    expect((await adminSocialPostsService.getPost('p1')).media).not.toHaveProperty('error')

    client.get.mockResolvedValue({ ...dto, media: { status: 'ARCHIVED' } })
    expect((await adminSocialPostsService.getPost('p1')).media).toBeNull()
  })

  it('requests a new illustration and returns the post with its pending media', async () => {
    client.newIllustration.mockResolvedValue({ ...dto, media: { status: 'PENDING', source: 'AI', slides: { es: null, en: null } } })

    await expect(adminSocialPostsService.newIllustration('p1')).resolves.toMatchObject({ id: 'p1', media: { status: 'PENDING' } })
    expect(client.newIllustration).toHaveBeenCalledWith('p1')
  })

  it('refuses a single post with an unknown status', async () => {
    client.get.mockResolvedValue({ ...dto, status: 'ARCHIVED' })
    await expect(adminSocialPostsService.getPost('p1')).rejects.toThrow('Unknown social post status: ARCHIVED')
  })

  it('plans the window and returns the created count', async () => {
    client.plan.mockResolvedValue({ created: 6, from: '2026-11-02', to: '2026-11-15', extra: true })
    await expect(adminSocialPostsService.planNow()).resolves.toEqual({ created: 6, from: '2026-11-02', to: '2026-11-15' })
  })

  it('approves, rejects with an optional trimmed reason, and regenerates', async () => {
    client.approve.mockResolvedValue({ ...dto, status: 'APPROVED' })
    client.reject.mockResolvedValue({ ...dto, status: 'REJECTED' })
    client.regenerate.mockResolvedValue(dto)

    await expect(adminSocialPostsService.approve('p1')).resolves.toMatchObject({ status: 'APPROVED' })
    await expect(adminSocialPostsService.reject('p1', '  Tono  ')).resolves.toMatchObject({ status: 'REJECTED' })
    await adminSocialPostsService.reject('p1', '   ')
    await expect(adminSocialPostsService.regenerate('p1')).resolves.toMatchObject({ id: 'p1' })

    expect(client.approve).toHaveBeenCalledWith('p1')
    expect(client.reject).toHaveBeenNthCalledWith(1, 'p1', { reason: 'Tono' })
    expect(client.reject).toHaveBeenNthCalledWith(2, 'p1', {})
    expect(client.regenerate).toHaveBeenCalledWith('p1')
  })

  it('sends an edited draft as the copy of its language with that legal line appended and without the illustration subject', async () => {
    client.update.mockResolvedValue(dto)
    const draft = { ...draftFromCopy({ ...copy, illustration: 'a bunch of grapes' }), caption: 'Nuevo texto', hashtags: 'vinnot malbec' }

    await adminSocialPostsService.updateCopy('p1', 'es', draft)

    expect(client.update).toHaveBeenCalledWith('p1', {
      language: 'es', ...copy, caption: `Nuevo texto\n\n${LEGAL_LINES.es}`, hashtags: ['#vinnot', '#malbec'],
    })
    expect(client.update.mock.calls[0]![1]).not.toHaveProperty('illustration')
  })

  it('sends an English edit with the English legal line', async () => {
    client.update.mockResolvedValue(dto)
    const draft = { ...draftFromCopy({ ...english, illustration: null }), caption: 'New caption' }

    await adminSocialPostsService.updateCopy('p1', 'en', draft)

    expect(client.update).toHaveBeenCalledWith('p1', { language: 'en', ...english, caption: `New caption\n\n${LEGAL_LINES.en}` })
  })

  it('maps the wine days, leaving out unknown kinds, and the pillars', async () => {
    client.getWineDays.mockResolvedValue([
      { code: 'MALBEC', nameEs: 'Día Mundial del Malbec', nameEn: 'Malbec World Day', kind: 'GRAPE', priority: 1, countryCode: 'AR', date: '2026-04-17' },
      { code: 'ODD', nameEs: 'Raro', nameEn: 'Odd', kind: 'HOLIDAY', priority: 3, countryCode: null, date: '2026-04-18' },
      { code: 'SYRAH', nameEs: 'Syrah', nameEn: 'Syrah', kind: 'GRAPE', priority: 2, countryCode: undefined, date: '2026-02-16' },
    ])
    client.getPillars.mockResolvedValue([{ code: 'QUIZ', nameEs: 'Quiz', nameEn: 'Quiz', weight: 1 }])

    await expect(adminSocialPostsService.getWineDays(2026)).resolves.toEqual([
      { code: 'MALBEC', nameEs: 'Día Mundial del Malbec', nameEn: 'Malbec World Day', kind: 'GRAPE', priority: 1, countryCode: 'AR', date: '2026-04-17' },
      { code: 'SYRAH', nameEs: 'Syrah', nameEn: 'Syrah', kind: 'GRAPE', priority: 2, countryCode: null, date: '2026-02-16' },
    ])
    await expect(adminSocialPostsService.getPillars()).resolves.toEqual([{
      code: 'QUIZ', nameEs: 'Quiz', nameEn: 'Quiz', weight: 1, active: true, autoApprove: false,
      performance: { measuredPosts: 0, views: 0, interactions: 0, factor: 1 },
    }])
    expect(client.getWineDays).toHaveBeenCalledWith(2026)
  })

  it('maps the publications in network order, leaving out networks and statuses this build cannot read', async () => {
    client.get.mockResolvedValue({
      ...dto,
      status: 'PUBLISHED',
      publishing: { startedAt: '2026-11-03T22:00:00Z', finishedAt: '2026-11-03T22:05:00Z', error: null },
      publications: [
        { network: 'TIKTOK', status: 'DRAFT_SENT', externalId: 'tt-1', permalink: null, attempts: 1, error: null, publishedAt: '2026-11-03T22:04:00Z', metrics: null },
        { network: 'MYSPACE', status: 'PUBLISHED', attempts: 1 },
        { network: 'INSTAGRAM', status: 'PUBLISHED', externalId: 'ig-1', permalink: 'https://instagram.com/p/1', attempts: 2, error: null, publishedAt: '2026-11-03T22:01:00Z',
          metrics: { views: 1200, reach: 900, likes: 80, comments: 4, saves: 10, shares: 3, follows: null } },
        { network: 'THREADS', status: 'ARCHIVED', attempts: 1 },
        { network: 'FACEBOOK', status: 'FAILED', error: 'TOKEN_INVALID', metrics: { views: 10 } },
      ],
      review: { reviewedBy: null, reviewedAt: '2026-11-02T22:00:00Z', reason: 'AUTO_APPROVED', automatic: true },
    })

    const post = await adminSocialPostsService.getPost('p1')
    expect(post.publishing).toEqual({ startedAt: '2026-11-03T22:00:00Z', finishedAt: '2026-11-03T22:05:00Z', error: null })
    expect(post.review).toEqual({ reviewedBy: null, reviewedAt: '2026-11-02T22:00:00Z', reason: 'AUTO_APPROVED', editedBy: null, automatic: true })
    expect(post.publications).toEqual([
      { network: 'INSTAGRAM', status: 'PUBLISHED', externalId: 'ig-1', permalink: 'https://instagram.com/p/1', attempts: 2, error: null, publishedAt: '2026-11-03T22:01:00Z',
        metrics: { views: 1200, reach: 900, likes: 80, comments: 4, saves: 10, shares: 3, follows: null } },
      { network: 'FACEBOOK', status: 'FAILED', externalId: null, permalink: null, attempts: 0, error: 'TOKEN_INVALID', publishedAt: null,
        metrics: { views: 10, reach: null, likes: null, comments: null, saves: null, shares: null, follows: null } },
      { network: 'TIKTOK', status: 'DRAFT_SENT', externalId: 'tt-1', permalink: null, attempts: 1, error: null, publishedAt: '2026-11-03T22:04:00Z', metrics: null },
    ])
  })

  it('fills the publishing record of a failed post and keeps its error', async () => {
    client.get.mockResolvedValue({ ...dto, status: 'FAILED', publishing: { error: 'MEDIA_NOT_READY' }, publications: null })
    const post = await adminSocialPostsService.getPost('p1')
    expect(post.publishing).toEqual({ startedAt: null, finishedAt: null, error: 'MEDIA_NOT_READY' })
    expect(post.publications).toEqual([])
  })

  it('retries the publication of one network', async () => {
    client.retryPublication.mockResolvedValue(undefined)
    await expect(adminSocialPostsService.retryPublication('p1', 'THREADS')).resolves.toBeUndefined()
    expect(client.retryPublication).toHaveBeenCalledWith('p1', 'THREADS')
  })

  it('switches auto-approval and planning of a pillar and maps the pillar it returns', async () => {
    const pillar = {
      code: 'TERROIR', nameEs: 'Terruño', nameEn: 'Terroir', weight: 3, active: false, autoApprove: true,
      performance: { measuredPosts: 4, views: 5000, interactions: 300, factor: 1.25 },
    }
    client.setPillarAutoApprove.mockResolvedValue(pillar)
    client.setPillarActive.mockResolvedValue(pillar)

    await expect(adminSocialPostsService.setPillarAutoApprove('TERROIR', true)).resolves.toEqual(pillar)
    await expect(adminSocialPostsService.setPillarActive('TERROIR', false)).resolves.toEqual(pillar)
    expect(client.setPillarAutoApprove).toHaveBeenCalledWith('TERROIR', true)
    expect(client.setPillarActive).toHaveBeenCalledWith('TERROIR', false)
  })

  it('recognises the refusal to switch off the last rotating pillar', () => {
    expect(isLastRotatingPillar(new HttpError(409, 'LAST_ROTATING_PILLAR', 'Last one'))).toBe(true)
    expect(isLastRotatingPillar(new HttpError(409, 'CONFLICT', 'Other'))).toBe(false)
    expect(isLastRotatingPillar(new Error('offline'))).toBe(false)
  })

  it('recognises a retry refused because publishing or the network is off', () => {
    expect(isPublishingOff(new HttpError(409, 'SOCIAL_PUBLISHING_OFF', 'Off'))).toBe(true)
    expect(isPublishingOff(new HttpError(409, 'INVALID_PUBLICATION_TRANSITION', 'Not failed'))).toBe(false)
    expect(isPublishingOff(new Error('offline'))).toBe(false)
  })

  it('maps the schedule flags and the per-network times in network order, leaving out networks this build cannot read (#513)', async () => {
    client.get.mockResolvedValue({
      ...dto,
      canReschedule: true,
      canPublishNow: true,
      networkSchedule: [
        { network: 'TIKTOK', publishAt: '2026-11-10T22:30:00Z' },
        { network: 'MASTODON', publishAt: '2026-11-10T15:30:00Z' },
        { network: 'INSTAGRAM', publishAt: '2026-11-10T15:30:00Z' },
      ],
    })

    const post = await adminSocialPostsService.getPost('p1')
    expect(post.canReschedule).toBe(true)
    expect(post.canPublishNow).toBe(true)
    expect(post.networkSchedule).toEqual([
      { network: 'INSTAGRAM', publishAt: '2026-11-10T15:30:00Z' },
      { network: 'TIKTOK', publishAt: '2026-11-10T22:30:00Z' },
    ])

    client.get.mockResolvedValue({ ...dto, canReschedule: null, canPublishNow: null, networkSchedule: null })
    const bare = await adminSocialPostsService.getPost('p1')
    expect([bare.canReschedule, bare.canPublishNow, bare.networkSchedule]).toEqual([false, false, []])
  })

  it('reschedules to the instant of the Argentina date and time the admin picked (#513)', async () => {
    client.reschedule.mockResolvedValue({ ...dto, scheduledFor: '2026-11-10T12:30:00Z' })

    await expect(adminSocialPostsService.reschedule('p1', { date: '2026-11-10', time: '09:30' }))
      .resolves.toMatchObject({ id: 'p1', scheduledFor: '2026-11-10T12:30:00Z' })
    expect(client.reschedule).toHaveBeenCalledWith('p1', { scheduledFor: '2026-11-10T12:30:00.000Z' })
  })

  it('refuses an impossible date without calling the backend (#513)', async () => {
    await expect(adminSocialPostsService.reschedule('p1', { date: '2026-02-30', time: '09:30' })).rejects.toThrow('Invalid schedule')
    expect(client.reschedule).not.toHaveBeenCalled()
  })

  it('publishes a post now and returns it (#513)', async () => {
    client.publishNow.mockResolvedValue({ ...dto, status: 'SCHEDULED' })
    await expect(adminSocialPostsService.publishNow('p1')).resolves.toMatchObject({ status: 'SCHEDULED' })
    expect(client.publishNow).toHaveBeenCalledWith('p1')
  })

  it.each([
    [new HttpError(400, 'SOCIAL_POST_SCHEDULE_NOT_FUTURE', 'Past'), 'NOT_FUTURE'],
    [new HttpError(409, 'SOCIAL_POST_DATE_TAKEN', 'Taken'), 'DATE_TAKEN'],
    [new HttpError(409, 'SOCIAL_POST_MEDIA_NOT_READY', 'Rendering'), 'MEDIA_NOT_READY'],
    [new HttpError(409, 'SOCIAL_PUBLISHING_OFF', 'Off'), 'PUBLISHING_OFF'],
    [new HttpError(409, 'INVALID_POST_TRANSITION', 'Not allowed'), 'CONFLICT'],
    [new HttpError(500, 'INTERNAL_ERROR', 'Boom'), 'OTHER'],
    [new Error('offline'), 'OTHER'],
  ] as const)('maps a refused schedule action %o to %s (#513)', (error, expected) => {
    expect(scheduleActionError(error)).toBe(expected)
  })

  it('recognises a transition the backend refused', () => {
    expect(isSocialPostConflict(new HttpError(409, 'CONFLICT', 'Invalid transition'))).toBe(true)
    expect(isSocialPostConflict(new HttpError(500, 'INTERNAL_ERROR', 'Boom'))).toBe(false)
    expect(isSocialPostConflict(new Error('offline'))).toBe(false)
  })
})
