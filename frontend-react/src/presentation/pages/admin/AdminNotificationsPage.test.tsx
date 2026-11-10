import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyAnnouncementDraft, type AnnouncementRecord } from '@domain/admin/announcement'
import { completeCounts } from '@domain/admin/pushAdministration'
import es from '@shared/i18n/locales/es-AR.json'
import en from '@shared/i18n/locales/en-US.json'
import { AdminNotificationsPage } from './AdminNotificationsPage'

const composer = vi.hoisted(() => vi.fn())
const pushControls = vi.hoisted(() => vi.fn())
const historyModel = vi.hoisted(() => vi.fn())
/** Echoes the key and its values, so a test sees which numbers reached the copy. */
const translate = vi.hoisted(() => (key: string, options?: Record<string, unknown>) => {
  const values = Object.entries(options ?? {}).filter(([name]) => name !== 'defaultValue')
  return values.length ? `${key} ${values.map(([name, value]) => `${name}=${String(value)}`).join(' ')}` : key
})
vi.mock('./useAnnouncementComposerViewModel', () => ({ useAnnouncementComposerViewModel: composer }))
vi.mock('./usePushControlsViewModel', () => ({ usePushControlsViewModel: pushControls }))
vi.mock('./useAdminNotificationsHistoryViewModel', () => ({ useAdminNotificationsHistoryViewModel: historyModel }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: translate, i18n: { language: 'en-US', resolvedLanguage: 'en-US' } }),
}))
afterEach(cleanup)

const actions = { sendTest: vi.fn(), openConfirm: vi.fn(), closeConfirm: vi.fn(), send: vi.fn(), applyFormat: vi.fn(), updateVersion: vi.fn() }
const historyActions = { open: vi.fn(), close: vi.fn(), retryDetail: vi.fn() }

const sent: AnnouncementRecord = {
  id: 'a1', kind: 'NEWS', test: false,
  audience: { email: true, push: true, language: null, countryId: null, regionId: null, role: null },
  destination: 'EVENTS', title: 'Harvest news', recipients: 12, sentBy: 'admin@vinnot.test',
  createdAt: '2026-10-20T12:00:00Z', completedAt: '2026-10-20T12:05:00Z',
  stats: { emailsSent: 10, emailsFailed: 1, pushesSent: 8, pushesFailed: 3, pushesOpened: 2 },
}

function composerState(overrides: Record<string, unknown> = {}) {
  const draft = emptyAnnouncementDraft()
  draft.versions.es = { title: 'Vendimia', body: 'Catas.' }
  return {
    t: translate,
    draft,
    language: 'es',
    setLanguage: vi.fn(),
    version: draft.versions.es,
    languages: ['es'],
    errors: [],
    setKind: vi.fn(),
    setDestination: vi.fn(),
    updateAudience: vi.fn(),
    bodyRef: { current: null },
    preview: { data: { subject: 'Vendimia', html: '<p>Hola</p>', text: 'Hola', pushTitle: 'Vendimia', pushBody: 'Catas.' }, isFetching: false, isError: false },
    previewable: true,
    reach: { data: { email: 3, push: 2, accounts: 4 }, isFetching: false },
    reachSettled: true,
    countries: [],
    regions: [],
    countryId: null,
    selectCountry: vi.fn(),
    history: { data: [], isLoading: false, isError: false, refetch: vi.fn() },
    working: false,
    testing: false,
    sending: false,
    confirming: false,
    ...actions,
    ...overrides,
  }
}

const reminder = { type: 'EVENT_REMINDER', category: 'TICKETS', transactional: true, enabled: true }

function pushState(overrides: Record<string, unknown> = {}) {
  return {
    t: translate,
    settings: { data: { provider: 'expo', types: [reminder], recentChanges: [] }, isError: false, refetch: vi.fn() },
    metrics: { data: { days: 7, from: '2026-10-14', types: [{ type: 'NEWSLETTER', counts: completeCounts({ SENT: 5 }) }] }, isError: false, isFetching: false, refetch: vi.fn() },
    days: 7,
    setDays: vi.fn(),
    engagement: { data: { days: 7, since: '2026-10-19T03:00:00Z', types: [{ type: 'TASTE_PICK', category: 'RECOMMENDATIONS', sent: 10, opened: 5, openRate: 0.5, optedOut: 0, heldOut: 1, paused: false }] }, isError: false, isFetching: false, refetch: vi.fn() },
    engagementDays: 7,
    setEngagementDays: vi.fn(),
    typeLabel: (type: string) => type,
    sending: true,
    switching: null,
    toggle: vi.fn(),
    pendingOff: null,
    cancelOff: vi.fn(),
    confirmOff: vi.fn(),
    ...overrides,
  }
}

function historyState(overrides: Record<string, unknown> = {}) {
  return {
    history: { data: [sent], isLoading: false, isError: false, refetch: vi.fn() },
    selected: null,
    detail: { loading: false, failed: false, notFound: false },
    ...historyActions,
    ...overrides,
  }
}

function renderPage() {
  render(<MemoryRouter><AdminNotificationsPage /></MemoryRouter>)
}

type TabKey = 'compose' | 'history' | 'settings'
const panel = (key: TabKey) => document.getElementById(`admin-notifications-panel-${key}`) as HTMLElement

function openTab(key: TabKey) {
  fireEvent.click(screen.getByRole('tab', { name: `admin.notifications.tabs.${key}` }))
}

describe('admin notifications page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    composer.mockReturnValue(composerState())
    pushControls.mockReturnValue(pushState())
    historyModel.mockReturnValue(historyState())
  })

  describe('tabs', () => {
    it('offers sending an announcement, its history and metrics, and the push settings, starting on the composer', () => {
      renderPage()
      expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
        'admin.notifications.tabs.compose', 'admin.notifications.tabs.history', 'admin.notifications.tabs.settings',
      ])
      expect(screen.getByRole('tab', { name: 'admin.notifications.tabs.compose' })).toHaveAttribute('aria-selected', 'true')
      expect(panel('compose')).not.toHaveAttribute('hidden')
      expect(panel('history')).toHaveAttribute('hidden')
      expect(panel('settings')).toHaveAttribute('hidden')
    })

    it('names the tabs so the push settings never pass for the delivery metrics', () => {
      expect(es.admin.notifications.tabs).toEqual({ compose: 'Enviar anuncio', history: 'Historial y métricas', settings: 'Ajustes de push' })
      expect(en.admin.notifications.tabs).toEqual({ compose: 'Send announcement', history: 'History and metrics', settings: 'Push settings' })
    })

    it('keeps the history out of the composer', () => {
      renderPage()
      expect(within(panel('compose')).queryByText('Harvest news')).toBeNull()
      expect(within(panel('compose')).queryByRole('region', { name: 'admin.notifications.history.heading' })).toBeNull()
      openTab('history')
      expect(within(panel('history')).getByRole('region', { name: 'admin.notifications.history.heading' })).toBeInTheDocument()
    })

    it('puts the sends, the per-type delivery metrics and the engagement together, without the switches', () => {
      renderPage()
      openTab('history')
      const history = panel('history')
      expect(history).not.toHaveAttribute('hidden')
      expect(within(history).getByRole('row', { name: /Harvest news/ })).toBeInTheDocument()
      expect(within(within(history).getByRole('region', { name: 'admin.notifications.metrics.heading' })).getByRole('row', { name: /NEWSLETTER/ })).toBeInTheDocument()
      expect(within(within(history).getByRole('region', { name: 'admin.notifications.engagement.heading' })).getByRole('row', { name: /TASTE_PICK/ })).toBeInTheDocument()
      expect(within(history).queryByRole('switch')).toBeNull()
    })

    it('keeps only the switches on the push settings tab', () => {
      renderPage()
      openTab('settings')
      const settings = panel('settings')
      expect(within(settings).getByRole('switch', { name: 'EVENT_REMINDER' })).toHaveAttribute('aria-checked', 'true')
      expect(within(settings).queryByRole('region', { name: 'admin.notifications.metrics.heading' })).toBeNull()
      expect(within(settings).queryByRole('region', { name: 'admin.notifications.engagement.heading' })).toBeNull()
    })

    it('toggles a push type with the same setting as before', () => {
      const controls = pushState()
      pushControls.mockReturnValue(controls)
      renderPage()
      openTab('settings')
      fireEvent.click(screen.getByRole('switch', { name: 'EVENT_REMINDER' }))
      expect(controls.toggle).toHaveBeenCalledExactlyOnceWith({ type: 'EVENT_REMINDER', category: 'TICKETS', transactional: true, enabled: true })
    })

    it('moves between the three tabs with the arrow keys and keeps the draft mounted', () => {
      renderPage()
      openTab('settings')
      expect(panel('compose')).toHaveAttribute('hidden')
      expect(within(panel('compose')).getByDisplayValue('Vendimia')).toBeInTheDocument()
      fireEvent.keyDown(screen.getByRole('tab', { name: 'admin.notifications.tabs.settings' }), { key: 'ArrowRight' })
      expect(panel('compose')).not.toHaveAttribute('hidden')
      expect(screen.getByRole('tab', { name: 'admin.notifications.tabs.compose' })).toHaveFocus()
      fireEvent.keyDown(screen.getByRole('tab', { name: 'admin.notifications.tabs.compose' }), { key: 'ArrowLeft' })
      expect(panel('settings')).not.toHaveAttribute('hidden')
      fireEvent.keyDown(screen.getByRole('tab', { name: 'admin.notifications.tabs.settings' }), { key: 'ArrowLeft' })
      expect(panel('history')).not.toHaveAttribute('hidden')
      fireEvent.keyDown(screen.getByRole('tab', { name: 'admin.notifications.tabs.history' }), { key: 'Enter' })
      expect(panel('history')).not.toHaveAttribute('hidden')
    })

    it('asks before turning a transactional push off', () => {
      const controls = pushState({ pendingOff: reminder })
      pushControls.mockReturnValue(controls)
      renderPage()
      const dialog = screen.getByRole('dialog', { name: 'admin.notifications.push.confirmOffTitle type=EVENT_REMINDER' })
      fireEvent.click(within(dialog).getByRole('button', { name: 'admin.notifications.push.confirmOff' }))
      fireEvent.click(within(dialog).getByRole('button', { name: 'common.cancel' }))
      expect(controls.confirmOff).toHaveBeenCalled()
      expect(controls.cancelOff).toHaveBeenCalled()
    })

    it('lets the admin retry failed settings, metrics and engagement', () => {
      const settings = vi.fn()
      const metrics = vi.fn()
      const engagement = vi.fn()
      pushControls.mockReturnValue(pushState({
        settings: { data: undefined, isError: true, refetch: settings },
        metrics: { data: undefined, isError: true, isFetching: false, refetch: metrics },
        engagement: { data: undefined, isError: true, isFetching: false, refetch: engagement },
      }))
      renderPage()
      openTab('settings')
      fireEvent.click(within(panel('settings')).getByRole('button', { name: 'common.retry' }))
      openTab('history')
      fireEvent.click(within(screen.getByRole('region', { name: 'admin.notifications.metrics.heading' })).getByRole('button'))
      fireEvent.click(within(screen.getByRole('region', { name: 'admin.notifications.engagement.heading' })).getByRole('button'))
      expect(settings).toHaveBeenCalled()
      expect(metrics).toHaveBeenCalled()
      expect(engagement).toHaveBeenCalled()
    })

    it('waits for the push settings before showing the switches', () => {
      pushControls.mockReturnValue(pushState({ settings: { data: undefined, isError: false, refetch: vi.fn() } }))
      renderPage()
      openTab('settings')
      expect(within(panel('settings')).queryByRole('switch')).toBeNull()
    })
  })

  describe('history', () => {
    it('shows what happened to each send by channel', () => {
      renderPage()
      openTab('history')
      const row = within(panel('history')).getByRole('row', { name: /Harvest news/ })
      expect(within(row).getByText('admin.notifications.history.emailResults sent=10 failed=1')).toBeInTheDocument()
      expect(within(row).getByText('admin.notifications.history.pushResults sent=8 opened=2')).toBeInTheDocument()
    })

    it('shows only the channels a send used', () => {
      historyModel.mockReturnValue(historyState({
        history: { data: [{ ...sent, audience: { ...sent.audience, push: false } }], isLoading: false, isError: false, refetch: vi.fn() },
      }))
      renderPage()
      openTab('history')
      const row = within(panel('history')).getByRole('row', { name: /Harvest news/ })
      expect(within(row).getByText(/admin.notifications.history.emailResults/)).toBeInTheDocument()
      expect(within(row).queryByText(/admin.notifications.history.pushResults/)).toBeNull()
    })

    it('opens the results of a send', () => {
      renderPage()
      openTab('history')
      const row = within(panel('history')).getByRole('row', { name: /Harvest news/ })
      fireEvent.click(within(row).getByRole('button', { name: 'admin.notifications.history.details title=Harvest news' }))
      expect(historyActions.open).toHaveBeenCalledExactlyOnceWith(sent)
    })

    it('says when nothing was sent yet and lets a failed history be retried', () => {
      const refetch = vi.fn()
      historyModel.mockReturnValue(historyState({ history: { data: [], isLoading: false, isError: false, refetch } }))
      renderPage()
      openTab('history')
      expect(within(panel('history')).getByText('admin.notifications.history.empty')).toBeInTheDocument()
      cleanup()
      historyModel.mockReturnValue(historyState({ history: { data: undefined, isLoading: false, isError: true, refetch } }))
      renderPage()
      openTab('history')
      fireEvent.click(within(screen.getByRole('region', { name: 'admin.notifications.history.heading' })).getByRole('button', { name: 'common.retry' }))
      expect(refetch).toHaveBeenCalled()
    })

    it('waits for the history', () => {
      historyModel.mockReturnValue(historyState({ history: { data: undefined, isLoading: true, isError: false, refetch: vi.fn() } }))
      renderPage()
      openTab('history')
      expect(within(screen.getByRole('region', { name: 'admin.notifications.history.heading' })).queryByRole('table')).toBeNull()
    })
  })

  describe('results of one send', () => {
    it('shows every count with what it measures, the open rate and how close the numbers are', () => {
      historyModel.mockReturnValue(historyState({ selected: sent }))
      renderPage()
      const dialog = screen.getByRole('dialog', { name: 'Harvest news' })
      const stat = (key: string) => within(dialog).getByRole('group', { name: `admin.notifications.detail.stats.${key}.label` })
      expect(within(stat('emailsSent')).getByText('10')).toBeInTheDocument()
      expect(within(stat('emailsSent')).getByText('admin.notifications.detail.stats.emailsSent.hint')).toBeInTheDocument()
      expect(within(stat('emailsFailed')).getByText('1')).toBeInTheDocument()
      expect(within(stat('emailsFailed')).getByText('admin.notifications.detail.stats.emailsFailed.hint')).toBeInTheDocument()
      expect(within(stat('pushesSent')).getByText('8')).toBeInTheDocument()
      expect(within(stat('pushesSent')).getByText('admin.notifications.detail.stats.pushesSent.hint')).toBeInTheDocument()
      expect(within(stat('pushesFailed')).getByText('3')).toBeInTheDocument()
      expect(within(stat('pushesFailed')).getByText('admin.notifications.detail.stats.pushesFailed.hint')).toBeInTheDocument()
      expect(within(stat('pushesOpened')).getByText('2')).toBeInTheDocument()
      expect(within(stat('pushesOpened')).getByText('admin.notifications.detail.stats.pushesOpened.hint')).toBeInTheDocument()
      expect(within(stat('openRate')).getByText('25%')).toBeInTheDocument()
      expect(within(dialog).getByText('admin.notifications.detail.approximate')).toBeInTheDocument()
      expect(within(dialog).queryByText('admin.notifications.detail.testNote')).toBeNull()
      expect(within(dialog).getByText('admin.notifications.detail.recipients')).toBeInTheDocument()
      expect(within(dialog).getByText('12')).toBeInTheDocument()
      fireEvent.click(within(dialog).getByRole('button', { name: 'common.close' }))
      expect(historyActions.close).toHaveBeenCalled()
    })

    it('explains how a test counts and leaves out a channel the send did not use', () => {
      historyModel.mockReturnValue(historyState({
        selected: { ...sent, test: true, completedAt: null, audience: { ...sent.audience, push: false } },
        detail: { loading: true, failed: false, notFound: false },
      }))
      renderPage()
      const dialog = screen.getByRole('dialog', { name: 'Harvest news' })
      expect(within(dialog).getByText('admin.notifications.detail.testNote')).toBeInTheDocument()
      expect(within(dialog).getByText('admin.notifications.history.sending')).toBeInTheDocument()
      expect(within(dialog).queryByRole('group', { name: 'admin.notifications.detail.stats.pushesSent.label' })).toBeNull()
      expect(within(dialog).getByRole('group', { name: 'admin.notifications.detail.stats.emailsSent.label' })).toBeInTheDocument()
    })

    it('shows no open rate before a push reached anyone', () => {
      historyModel.mockReturnValue(historyState({ selected: { ...sent, stats: { ...sent.stats, pushesSent: 0, pushesOpened: 0 } } }))
      renderPage()
      const rate = within(screen.getByRole('dialog')).getByRole('group', { name: 'admin.notifications.detail.stats.openRate.label' })
      expect(within(rate).getByText('—')).toBeInTheDocument()
    })

    it('says when the send no longer exists instead of showing counts', () => {
      historyModel.mockReturnValue(historyState({ selected: sent, detail: { loading: false, failed: false, notFound: true } }))
      renderPage()
      const dialog = screen.getByRole('dialog', { name: 'Harvest news' })
      expect(within(dialog).getByText('admin.notifications.detail.notFound')).toBeInTheDocument()
      expect(within(dialog).queryByRole('group')).toBeNull()
    })

    it('lets a failed read of the latest results be retried', () => {
      historyModel.mockReturnValue(historyState({ selected: sent, detail: { loading: false, failed: true, notFound: false } }))
      renderPage()
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'common.retry' }))
      expect(historyActions.retryDetail).toHaveBeenCalled()
    })
  })

  describe('composer', () => {
    it('shows the email in a frame that cannot run scripts, the push text and the reach', () => {
      renderPage()
      const frame = screen.getByTitle('admin.notifications.preview.emailFrame')
      expect(frame).toHaveAttribute('sandbox', '')
      expect(frame).toHaveAttribute('srcdoc', '<p>Hola</p>')
      expect(screen.getAllByText('Vendimia').length).toBeGreaterThan(0)
      expect(screen.getByText('admin.notifications.audience.accounts count=4')).toBeInTheDocument()
    })

    it('shows the app icon in the push preview from a raster image', () => {
      // An SVG loaded through <img> never loads the images it links to, so the icon must be the PNG itself.
      renderPage()
      expect(document.querySelector('img[src="/favicon.png"]')).not.toBeNull()
    })

    it('names the channels as email and push notification', () => {
      renderPage()
      const channels = screen.getByRole('group', { name: 'admin.notifications.audience.channels' })
      expect(within(channels).getByRole('checkbox', { name: 'admin.notifications.audience.email' })).toBeChecked()
      expect(within(channels).getByRole('checkbox', { name: 'admin.notifications.audience.push' })).toBeChecked()
      expect([es.admin.notifications.audience.channels, es.admin.notifications.audience.email, es.admin.notifications.audience.push])
        .toEqual(['Canal', 'Email', 'Notificación push'])
      expect([en.admin.notifications.audience.channels, en.admin.notifications.audience.email, en.admin.notifications.audience.push])
        .toEqual(['Channel', 'Email', 'Push notification'])
    })

    it('tests and asks for confirmation before sending', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: 'admin.notifications.composer.sendTest' }))
      fireEvent.click(screen.getByRole('button', { name: 'admin.notifications.composer.send' }))
      expect(actions.sendTest).toHaveBeenCalled()
      expect(actions.openConfirm).toHaveBeenCalled()
      expect(screen.queryByText('admin.notifications.composer.noReach')).toBeNull()
    })

    it('explains why it cannot send when nobody matches the audience, and still allows a test', () => {
      composer.mockReturnValue(composerState({ reach: { data: { email: 0, push: 0, accounts: 0 }, isFetching: false } }))
      renderPage()
      expect(screen.getByRole('button', { name: 'admin.notifications.composer.send' })).toBeDisabled()
      expect(screen.getByRole('status')).toHaveTextContent('admin.notifications.composer.noReach')
      expect(screen.getByRole('button', { name: 'admin.notifications.composer.sendTest' })).toBeEnabled()
    })

    it('splits the reach by channel in the confirmation, noting an account may get both', () => {
      composer.mockReturnValue(composerState({ confirming: true }))
      renderPage()
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('admin.notifications.audience.byEmail count=3 · admin.notifications.audience.byPush count=2')).toBeInTheDocument()
      expect(within(dialog).getByText('admin.notifications.confirm.overlap')).toBeInTheDocument()
    })

    it('confirms only the channel chosen', () => {
      const draft = emptyAnnouncementDraft()
      draft.versions.es = { title: 'Vendimia', body: 'Catas.' }
      draft.audience.push = false
      composer.mockReturnValue(composerState({ confirming: true, draft, reach: { data: { email: 3, push: 0, accounts: 3 }, isFetching: false } }))
      renderPage()
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('admin.notifications.audience.byEmail count=3')).toBeInTheDocument()
      expect(within(dialog).queryByText('admin.notifications.confirm.overlap')).toBeNull()
    })

    it('sends from the confirmation dialog', () => {
      composer.mockReturnValue(composerState({ confirming: true }))
      renderPage()
      const dialog = screen.getByRole('dialog')
      fireEvent.click(within(dialog).getByRole('button', { name: 'admin.notifications.confirm.send' }))
      expect(actions.send).toHaveBeenCalled()
    })

    it('waits for the reach of the current audience before sending', () => {
      composer.mockReturnValue(composerState({ reachSettled: false, confirming: true, reach: { data: undefined, isFetching: true } }))
      renderPage()
      expect(screen.getByRole('button', { name: 'admin.notifications.composer.send' })).toBeDisabled()
      expect(screen.queryByText('admin.notifications.composer.noReach')).toBeNull()
      expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'admin.notifications.confirm.send' })).toBeDisabled()
    })

    it('blocks test and send while the draft is incomplete and says why', () => {
      composer.mockReturnValue(composerState({ errors: ['CHANNEL_REQUIRED'] }))
      renderPage()
      expect(screen.getByRole('button', { name: 'admin.notifications.composer.sendTest' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'admin.notifications.composer.send' })).toBeDisabled()
      expect(screen.getByText('admin.notifications.draftErrors.CHANNEL_REQUIRED')).toBeInTheDocument()
    })

    it('explains a failed reach and lets the admin retry', () => {
      const refetch = vi.fn()
      composer.mockReturnValue(composerState({ reach: { data: undefined, isFetching: false, isError: true, refetch } }))
      renderPage()
      expect(screen.getByText('admin.notifications.audience.reachError')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'common.retry' }))
      expect(refetch).toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'admin.notifications.composer.send' })).toBeDisabled()
    })

    it('cannot dismiss the confirmation while the send is in flight', () => {
      composer.mockReturnValue(composerState({ confirming: true, sending: true, working: true }))
      renderPage()
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByRole('button', { name: 'common.cancel' })).toBeDisabled()
      fireEvent.keyDown(dialog, { key: 'Escape' })
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(actions.closeConfirm).not.toHaveBeenCalled()
    })
  })
})
