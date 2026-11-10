import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SocialAccount } from '@domain/admin/socialAccount'
import { SocialAccountsPanel, SocialConnectionNotice } from './SocialAccountsPanel'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
    i18n: { language: 'es-AR', resolvedLanguage: 'es-AR' },
  }),
}))
afterEach(cleanup)

const instagram: SocialAccount = {
  network: 'INSTAGRAM', mode: 'CONFIG', configured: true, connected: true, accountId: '178', displayName: null,
  status: 'CONNECTED', expiresAt: null, lastError: null,
}
const facebook: SocialAccount = { ...instagram, network: 'FACEBOOK', configured: false, connected: false, accountId: null, status: null }
const threads: SocialAccount = {
  network: 'THREADS', mode: 'OAUTH', configured: true, connected: true, accountId: 't-1', displayName: '@vinnot',
  status: 'CONNECTED', expiresAt: '2027-01-01T00:00:00Z', lastError: null,
}
const tiktok: SocialAccount = {
  network: 'TIKTOK', mode: 'OAUTH', configured: true, connected: false, accountId: null, displayName: null,
  status: null, expiresAt: null, lastError: null,
}
const base = {
  accounts: [instagram, facebook, threads, tiktok], loading: false, failed: false, busy: null,
  formatDate: (iso: string) => `date:${iso}`, onRetry: vi.fn(), onConnect: vi.fn(), onDisconnect: vi.fn(),
}

function rows() {
  return within(screen.getByRole('list', { name: 'admin.socialPosts.accounts.heading' })).getAllByRole('listitem').map((row) => within(row))
}

describe('social accounts panel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows networks configured by the server without connect or disconnect actions', () => {
    render(<SocialAccountsPanel {...base} />)
    const [ig, fb] = rows()
    expect(ig!.getByText('admin.socialPosts.networks.INSTAGRAM')).toBeInTheDocument()
    expect(ig!.getByText('admin.socialPosts.accounts.configured')).toBeInTheDocument()
    expect(ig!.getByText('admin.socialPosts.accounts.account {"name":"178"}')).toBeInTheDocument()
    expect(ig!.queryByRole('button')).not.toBeInTheDocument()
    expect(fb!.getByText('admin.socialPosts.accounts.notConfigured')).toBeInTheDocument()
    expect(fb!.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows a connected OAuth network with its account and expiry, and reconnects or disconnects it', () => {
    render(<SocialAccountsPanel {...base} />)
    const th = rows()[2]!
    expect(th.getByText('admin.socialPosts.accounts.connected')).toBeInTheDocument()
    expect(th.getByText('admin.socialPosts.accounts.account {"name":"@vinnot"}')).toBeInTheDocument()
    expect(th.getByText('admin.socialPosts.accounts.expiresAt {"date":"date:2027-01-01T00:00:00Z"}')).toBeInTheDocument()
    fireEvent.click(th.getByRole('button', { name: 'admin.socialPosts.accounts.reconnect' }))
    expect(base.onConnect).toHaveBeenCalledWith('THREADS')
    fireEvent.click(th.getByRole('button', { name: 'admin.socialPosts.accounts.disconnect' }))
    expect(base.onDisconnect).toHaveBeenCalledWith('THREADS')
  })

  it('connects an OAuth network that has no account yet', () => {
    render(<SocialAccountsPanel {...base} />)
    const tt = rows()[3]!
    expect(tt.getByText('admin.socialPosts.accounts.notConnected')).toBeInTheDocument()
    expect(tt.queryByRole('button', { name: 'admin.socialPosts.accounts.disconnect' })).not.toBeInTheDocument()
    fireEvent.click(tt.getByRole('button', { name: 'admin.socialPosts.accounts.connect' }))
    expect(base.onConnect).toHaveBeenCalledWith('TIKTOK')
  })

  it('asks to reconnect after a failed refresh and shows the last error and unknown statuses as they come', () => {
    const refreshFailed = { ...threads, connected: false, status: 'REFRESH_FAILED', lastError: 'TOKEN_INVALID' }
    const revoked = { ...tiktok, connected: false, status: 'REVOKED' }
    render(<SocialAccountsPanel {...base} accounts={[refreshFailed, revoked]} />)
    const [th, tt] = rows()
    expect(th!.getByText('admin.socialPosts.accounts.refreshFailed')).toBeInTheDocument()
    expect(th!.getByText('admin.socialPosts.accounts.lastError {"code":"TOKEN_INVALID"}')).toBeInTheDocument()
    expect(th!.getByRole('button', { name: 'admin.socialPosts.accounts.reconnect' })).toBeEnabled()
    expect(th!.getByRole('button', { name: 'admin.socialPosts.accounts.disconnect' })).toBeEnabled()
    expect(tt!.getByText('admin.socialPosts.accounts.status {"status":"REVOKED"}')).toBeInTheDocument()
  })

  it('disables connect when the network app is not configured on the server', () => {
    render(<SocialAccountsPanel {...base} accounts={[{ ...tiktok, configured: false }]} />)
    const tt = rows()[0]!
    expect(tt.getByRole('button', { name: 'admin.socialPosts.accounts.connect' })).toBeDisabled()
    expect(tt.getByText('admin.socialPosts.accounts.appMissing')).toBeInTheDocument()
  })

  it('locks the actions while a network is busy', () => {
    render(<SocialAccountsPanel {...base} busy="THREADS" />)
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled()
  })

  it('shows loading, failure with retry and an empty list', () => {
    const { rerender, container } = render(<SocialAccountsPanel {...base} loading accounts={[]} />)
    expect(container.querySelector('[role="status"]')).not.toBeNull()

    rerender(<SocialAccountsPanel {...base} failed accounts={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }))
    expect(base.onRetry).toHaveBeenCalledTimes(1)

    rerender(<SocialAccountsPanel {...base} accounts={[]} />)
    expect(screen.getByText('admin.socialPosts.accounts.empty')).toBeInTheDocument()
  })
})

describe('social connection notice', () => {
  it('renders nothing without an OAuth return', () => {
    const { container } = render(<SocialConnectionNotice notice={null} onDismiss={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('confirms a connected network and can be dismissed', () => {
    const onDismiss = vi.fn()
    render(<SocialConnectionNotice notice={{ network: 'THREADS', outcome: 'connected' }} onDismiss={onDismiss} />)
    expect(screen.getByRole('status')).toHaveTextContent('admin.socialPosts.accounts.resultConnected {"network":"admin.socialPosts.networks.THREADS"}')
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.accounts.dismiss' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('reports a failed connection, naming the network when known', () => {
    const { rerender } = render(<SocialConnectionNotice notice={{ network: 'TIKTOK', outcome: 'error' }} onDismiss={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('admin.socialPosts.accounts.resultError {"network":"admin.socialPosts.networks.TIKTOK"}')
    rerender(<SocialConnectionNotice notice={{ network: null, outcome: 'error' }} onDismiss={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('admin.socialPosts.accounts.resultErrorUnknown')
  })
})
