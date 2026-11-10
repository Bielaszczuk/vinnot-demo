import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LEGAL_LINES, SOCIAL_POST_STATUSES, type SocialPost, type WineDay } from '@domain/admin/socialPost'
import { AdminSocialPostsPage } from './AdminSocialPostsPage'

const viewModel = vi.hoisted(() => vi.fn())
const panels = vi.hoisted(() => ({ retry: vi.fn(), pillars: vi.fn(), accounts: vi.fn(), schedule: vi.fn() }))
vi.mock('./useAdminSocialPostsViewModel', () => ({ useAdminSocialPostsViewModel: viewModel }))
vi.mock('@components/features/admin/social-posts/useSocialPublicationRetry', () => ({ useSocialPublicationRetry: panels.retry }))
vi.mock('@components/features/admin/social-posts/useSocialPostSchedule', () => ({ useSocialPostSchedule: panels.schedule }))
vi.mock('@components/features/admin/social-posts/useContentPillarsPanel', () => ({ useContentPillarsPanel: panels.pillars }))
vi.mock('@components/features/admin/social-posts/useSocialAccountsPanel', () => ({ useSocialAccountsPanel: panels.accounts }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
    i18n: { language: 'es-AR', resolvedLanguage: 'es-AR' },
  }),
}))
afterEach(cleanup)

const post: SocialPost = {
  id: 'p1', status: 'PENDING_APPROVAL', scheduledFor: '2026-11-03T22:00:00Z',
  pillar: { code: 'CURIOUS_FACT', nameEs: 'Dato curioso', nameEn: 'Curious fact', weight: 2 },
  wineDay: { code: 'MERLOT', nameEs: 'Día del Merlot', nameEn: 'Merlot Day', date: '2026-11-07' },
  copies: {
    es: {
      hook: 'Tres datos sobre el Merlot',
      slides: [{ title: 'Uno', body: 'Primero.' }, { title: 'Dos', body: 'Segundo.' }, { title: 'Tres', body: 'Tercero.' }],
      caption: `Datos del Merlot.\n\n${LEGAL_LINES.es}`,
      hashtags: ['#vinnot', '#merlot'],
      altText: 'Carrusel con tres datos.',
      cta: '¿Cuál te sorprendió?',
      illustration: null,
    },
    en: null,
  },
  generation: { provider: 'mock', model: 'mock-1', mock: true, attempts: 1, generatedAt: '2026-11-02T12:00:00Z', factCheck: 'FLAGGED', issues: ['1853 es discutido'], error: null },
  review: null, media: null, publishing: null, publications: [], canReschedule: false, canPublishNow: false, networkSchedule: [], createdAt: '2026-11-02T12:00:00Z', updatedAt: '2026-11-02T12:00:00Z',
}
const wineDays: WineDay[] = [
  { code: 'MERLOT', nameEs: 'Día del Merlot', nameEn: 'Merlot Day', kind: 'GRAPE', priority: 1, countryCode: null, date: '2026-11-07' },
  { code: 'CABERNET_FRANC', nameEs: 'Día del Cabernet Franc', nameEn: 'Cabernet Franc Day', kind: 'GRAPE', priority: 1, countryCode: null, date: '2026-12-04' },
]

const actions = {
  setStatus: vi.fn(), setPage: vi.fn(), selectPost: vi.fn(), refetch: vi.fn(), refetchDetail: vi.fn(), approve: vi.fn(),
  startReject: vi.fn(), cancelReject: vi.fn(), confirmReject: vi.fn(), setReason: vi.fn(), regenerate: vi.fn(), startEdit: vi.fn(),
  cancelEdit: vi.fn(), saveEdit: vi.fn(), updateDraft: vi.fn(), updateSlide: vi.fn(), addSlide: vi.fn(), removeSlide: vi.fn(),
  planNow: vi.fn(), refetchWineDays: vi.fn(), newIllustration: vi.fn(), setContentLanguage: vi.fn(),
}

function state(overrides: Record<string, unknown> = {}) {
  return {
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
    language: 'es-AR',
    contentLanguage: 'es',
    formatDate: (iso: string) => `date:${iso}`,
    formatDay: (date: string) => `day:${date}`,
    status: 'PENDING_APPROVAL',
    page: 0,
    posts: [post],
    totalItems: 1,
    totalPages: 1,
    isLoading: false,
    isError: false,
    selectedId: 'p1',
    post,
    isDetailLoading: false,
    isDetailError: false,
    actions: ['approve', 'reject', 'edit', 'regenerate'],
    working: false,
    canRequestIllustration: true,
    rejecting: false,
    reason: '',
    editing: false,
    draft: { hook: 'Tres datos sobre el Merlot', slides: post.copies.es!.slides, caption: 'Datos', hashtags: '#vinnot #merlot', altText: 'Alt', cta: 'CTA' },
    draftErrors: [],
    isPlanning: false,
    lastPlan: null,
    wineDays,
    wineDaysLoading: false,
    wineDaysError: false,
    ...actions,
    ...overrides,
  }
}

const panelActions = {
  retry: vi.fn(), toggleActive: vi.fn(), toggleAutoApprove: vi.fn(), refetchPillars: vi.fn(), connect: vi.fn(), disconnect: vi.fn(),
  refetchAccounts: vi.fn(), dismissNotice: vi.fn(), startReschedule: vi.fn(), startPublishNow: vi.fn(),
}
const terroir = {
  code: 'TERROIR', nameEs: 'Terruño', nameEn: 'Terroir', weight: 3, active: true, autoApprove: false,
  performance: { measuredPosts: 4, views: 5000, interactions: 300, factor: 1.25 },
}
const threads = {
  network: 'THREADS', mode: 'OAUTH', configured: true, connected: false, accountId: null, displayName: null,
  status: null, expiresAt: null, lastError: null,
}

function renderPage(overrides: Record<string, unknown> = {}, accounts: Record<string, unknown> = {}, schedule: Record<string, unknown> = {}) {
  viewModel.mockReturnValue(state(overrides))
  panels.schedule.mockReturnValue({
    rescheduling: false, date: '2026-11-03', time: '19:00', canSave: true, confirmingPublishNow: false, busy: false,
    formatTime: (iso: string) => `time:${iso}`, setDate: vi.fn(), setTime: vi.fn(), startReschedule: panelActions.startReschedule,
    cancelReschedule: vi.fn(), saveSchedule: vi.fn(), startPublishNow: panelActions.startPublishNow, cancelPublishNow: vi.fn(),
    confirmPublishNow: vi.fn(), ...schedule,
  })
  panels.retry.mockReturnValue({ retryingNetwork: null, retry: panelActions.retry, formatNumber: (value: number) => `n:${value}` })
  panels.pillars.mockReturnValue({
    pillars: [terroir], loading: false, failed: false, refetch: panelActions.refetchPillars, switching: null,
    formatNumber: (value: number) => `n:${value}`, toggleActive: panelActions.toggleActive, toggleAutoApprove: panelActions.toggleAutoApprove,
  })
  panels.accounts.mockReturnValue({
    accounts: [threads], loading: false, failed: false, refetch: panelActions.refetchAccounts, busy: null, notice: null,
    dismissNotice: panelActions.dismissNotice, connect: panelActions.connect, disconnect: panelActions.disconnect, ...accounts,
  })
  return render(<MemoryRouter><AdminSocialPostsPage /></MemoryRouter>)
}

describe('admin social posts page', () => {
  beforeEach(() => vi.clearAllMocks())

  it('filters by status with a tab per status, pending selected by default', () => {
    renderPage()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(SOCIAL_POST_STATUSES.map((status) => `admin.socialPosts.status.${status}`))
    expect(screen.getByRole('tab', { name: 'admin.socialPosts.status.PENDING_APPROVAL' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: 'admin.socialPosts.status.APPROVED' }))
    expect(actions.setStatus).toHaveBeenCalledWith('APPROVED')
  })

  it('shows the queue on the left, the selected post with every slide, the legal line, the badges and the wine days', () => {
    renderPage()
    const queue = within(screen.getByRole('list', { name: 'admin.socialPosts.queue.heading' }))
    fireEvent.click(queue.getByRole('button'))
    expect(actions.selectPost).toHaveBeenCalledWith('p1')

    const preview = within(screen.getByRole('list', { name: 'admin.socialPosts.detail.preview' }))
    expect(preview.getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByText(/Datos del Merlot\./)).toHaveTextContent(LEGAL_LINES.es)
    expect(screen.getByText('admin.socialPosts.detail.legalLine')).toBeInTheDocument()
    expect(screen.getByText('admin.socialPosts.generation.factCheck.FLAGGED')).toBeInTheDocument()
    expect(screen.getByText('1853 es discutido')).toBeInTheDocument()
    expect(screen.getAllByText('admin.socialPosts.generation.mock')).not.toHaveLength(0)

    const days = within(screen.getByRole('list', { name: 'admin.socialPosts.wineDays.heading' }))
    expect(days.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Día del Merlot'),
      expect.stringContaining('Día del Cabernet Franc'),
    ])
  })

  it('switches the content language from the detail and shows the pending one with its regenerate action', () => {
    const { unmount } = renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.languages.short.en' }))
    expect(actions.setContentLanguage).toHaveBeenCalledWith('en')
    unmount()

    renderPage({ contentLanguage: 'en', actions: ['approve', 'reject', 'regenerate'] })
    expect(screen.getByRole('button', { name: 'admin.socialPosts.languages.short.en' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('admin.socialPosts.languages.pending')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.actions.regenerate' }))
    expect(actions.regenerate).toHaveBeenCalledTimes(1)
  })

  it('requests a new illustration from the slides of the detail', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.media.newIllustration' }))
    expect(actions.newIllustration).toHaveBeenCalledTimes(1)
  })

  it('runs the four actions from the detail', () => {
    renderPage()
    fireEvent.click(screen.getByText('admin.socialPosts.actions.approve'))
    fireEvent.click(screen.getByText('admin.socialPosts.actions.reject'))
    fireEvent.click(screen.getByText('admin.socialPosts.actions.edit'))
    fireEvent.click(screen.getByText('admin.socialPosts.actions.regenerate'))
    expect(actions.approve).toHaveBeenCalledTimes(1)
    expect(actions.startReject).toHaveBeenCalledTimes(1)
    expect(actions.startEdit).toHaveBeenCalledTimes(1)
    expect(actions.regenerate).toHaveBeenCalledTimes(1)
  })

  it('plans now and shows the created count', () => {
    renderPage({ lastPlan: { created: 6, from: '2026-11-02', to: '2026-11-15' } })
    fireEvent.click(screen.getByText('admin.socialPosts.planNow'))
    expect(actions.planNow).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toHaveTextContent('admin.socialPosts.planned {"count":6,"from":"2026-11-02","to":"2026-11-15"}')
    expect(screen.queryByText('admin.socialPosts.writingCopy')).not.toBeInTheDocument()
  })

  it('tells the admin the AI is still writing the planned copy', () => {
    renderPage({ lastPlan: { created: 6, from: '2026-11-02', to: '2026-11-15' }, awaitingCopy: true })
    expect(screen.getByRole('status')).toHaveTextContent('admin.socialPosts.writingCopy')
  })

  it('shows the inline editor instead of the detail while editing', () => {
    renderPage({ editing: true, contentLanguage: 'en' })
    expect(screen.getByLabelText('admin.socialPosts.editor.hook')).toHaveValue('Tres datos sobre el Merlot')
    expect(screen.getByText('admin.socialPosts.editor.language {"language":"admin.socialPosts.languages.en"}')).toBeInTheDocument()
    fireEvent.click(screen.getByText('admin.socialPosts.editor.save'))
    expect(actions.saveEdit).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('admin.socialPosts.actions.approve')).not.toBeInTheDocument()
  })

  it('asks to pick a post, shows the detail error or its spinner', () => {
    const { unmount } = renderPage({ selectedId: undefined, post: undefined })
    expect(screen.getByText('admin.socialPosts.detail.empty')).toBeInTheDocument()
    unmount()

    const failed = renderPage({ isDetailError: true, post: undefined })
    fireEvent.click(within(failed.container).getByText('common.retry'))
    expect(actions.refetchDetail).toHaveBeenCalled()
    failed.unmount()

    renderPage({ isDetailLoading: true, post: undefined })
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
  })

  it('retries a failed network of the selected post from its publications', () => {
    renderPage({
      post: {
        ...post, status: 'FAILED', publishing: { startedAt: null, finishedAt: null, error: null },
        publications: [{ network: 'TIKTOK', status: 'FAILED', externalId: null, permalink: null, attempts: 3, error: 'REJECTED', publishedAt: null, metrics: null }],
      },
    })
    expect(panels.retry).toHaveBeenCalledWith('p1')
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.publications.retry {"network":"admin.socialPosts.networks.TIKTOK"}' }))
    expect(panelActions.retry).toHaveBeenCalledWith('TIKTOK')
  })

  it('shows the network times of the selected post and its reschedule and publish-now actions (#513)', () => {
    renderPage({
      post: { ...post, status: 'APPROVED', canReschedule: true, canPublishNow: true, networkSchedule: [{ network: 'TIKTOK', publishAt: '2026-11-03T22:30:00Z' }] },
      actions: ['reject', 'edit', 'regenerate'],
    })
    expect(panels.schedule).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }))
    const times = within(screen.getByRole('list', { name: 'admin.socialPosts.schedule.networks' }))
    expect(times.getByRole('listitem')).toHaveTextContent('admin.socialPosts.networks.TIKTOKtime:2026-11-03T22:30:00Z')
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.schedule.change' }))
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.schedule.publishNow' }))
    expect(panelActions.startReschedule).toHaveBeenCalledTimes(1)
    expect(panelActions.startPublishNow).toHaveBeenCalledTimes(1)
  })

  it('disables the review actions while a schedule action runs (#513)', () => {
    renderPage({}, {}, { busy: true })
    expect(screen.getByRole('button', { name: 'admin.socialPosts.actions.approve' })).toBeDisabled()
  })

  it('lists the pillars with their switches and the network connections', () => {
    renderPage()
    const pillars = within(screen.getByRole('region', { name: 'admin.socialPosts.pillars.heading' }))
    fireEvent.click(pillars.getByRole('switch', { name: 'admin.socialPosts.pillars.activeLabel {"pillar":"Terruño"}' }))
    fireEvent.click(pillars.getByRole('switch', { name: 'admin.socialPosts.pillars.autoApproveLabel {"pillar":"Terruño"}' }))
    expect(panelActions.toggleActive).toHaveBeenCalledWith(terroir)
    expect(panelActions.toggleAutoApprove).toHaveBeenCalledWith(terroir)

    const accounts = within(screen.getByRole('region', { name: 'admin.socialPosts.accounts.heading' }))
    fireEvent.click(accounts.getByRole('button', { name: 'admin.socialPosts.accounts.connect' }))
    expect(panelActions.connect).toHaveBeenCalledWith('THREADS')
  })

  it('shows the result of the OAuth return once at the top of the page', () => {
    renderPage({}, { notice: { network: 'THREADS', outcome: 'connected' } })
    expect(screen.getByText('admin.socialPosts.accounts.resultConnected {"network":"admin.socialPosts.networks.THREADS"}')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.accounts.dismiss' }))
    expect(panelActions.dismissNotice).toHaveBeenCalledTimes(1)
  })
})
