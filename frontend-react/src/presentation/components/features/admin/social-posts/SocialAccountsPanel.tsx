/**
 * The network connections the agent publishes with (#510 S5): Instagram and Facebook are configured by server secrets;
 * Threads and TikTok are connected here with OAuth. Plus the one-time notice of the OAuth return.
 */
import { useTranslation } from 'react-i18next'
import { Button } from '@components/ui/Button'
import { Spinner } from '@components/ui/Spinner'
import { AdminQueryError } from '@components/features/admin/AdminQueryError'
import {
  canConnectAccount,
  canDisconnectAccount,
  knownAccountStatus,
  type ConnectionResult,
  type SocialAccount,
} from '@domain/admin/socialAccount'
import type { SocialNetwork } from '@domain/admin/socialPost'

interface SocialAccountsPanelProps {
  accounts: SocialAccount[]
  loading: boolean
  failed: boolean
  /** Network whose connect or disconnect is running; every action waits for it. */
  busy: SocialNetwork | null
  formatDate: (iso: string) => string
  onRetry: () => unknown
  onConnect: (network: SocialNetwork) => unknown
  onDisconnect: (network: SocialNetwork) => unknown
}

/** The state line of a network: server configuration for CONFIG, connection state for OAUTH. */
function stateKey(account: SocialAccount): { key: string; tone: string; status?: string } {
  if (account.mode === 'CONFIG') {
    return account.configured
      ? { key: 'admin.socialPosts.accounts.configured', tone: 'text-green-700' }
      : { key: 'admin.socialPosts.accounts.notConfigured', tone: 'text-gray-500' }
  }
  if (account.connected) return { key: 'admin.socialPosts.accounts.connected', tone: 'text-green-700' }
  if (account.status === null) return { key: 'admin.socialPosts.accounts.notConnected', tone: 'text-gray-500' }
  if (knownAccountStatus(account.status) === 'REFRESH_FAILED') return { key: 'admin.socialPosts.accounts.refreshFailed', tone: 'text-red-700' }
  return { key: 'admin.socialPosts.accounts.status', tone: 'text-amber-800', status: account.status }
}

export function SocialAccountsPanel({ accounts, loading, failed, busy, formatDate, onRetry, onConnect, onDisconnect }: SocialAccountsPanelProps) {
  const { t } = useTranslation()
  if (loading) return <div className="p-8 text-center"><Spinner /></div>
  if (failed) return <AdminQueryError retry={onRetry} />
  if (accounts.length === 0) return <p className="p-6 text-center text-sm text-gray-500">{t('admin.socialPosts.accounts.empty')}</p>
  return (
    <ul aria-label={t('admin.socialPosts.accounts.heading')} className="divide-y divide-gray-100">
      {accounts.map((account) => {
        const state = stateKey(account)
        const name = account.displayName ?? account.accountId
        return (
          <li key={account.network} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-gray-900">{t(`admin.socialPosts.networks.${account.network}`)}</p>
              <p className={`text-xs ${state.tone}`}>{state.status ? t(state.key, { status: state.status }) : t(state.key)}</p>
              {name && <p className="text-xs text-gray-600">{t('admin.socialPosts.accounts.account', { name })}</p>}
              {account.expiresAt && <p className="text-xs text-gray-600">{t('admin.socialPosts.accounts.expiresAt', { date: formatDate(account.expiresAt) })}</p>}
              {account.lastError && <p className="text-xs text-red-700">{t('admin.socialPosts.accounts.lastError', { code: account.lastError })}</p>}
              {account.mode === 'OAUTH' && !account.configured && <p className="text-xs text-amber-800">{t('admin.socialPosts.accounts.appMissing')}</p>}
            </div>
            {account.mode === 'OAUTH' && (
              <div className="flex flex-wrap gap-2">
                {canDisconnectAccount(account) && (
                  <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => void onDisconnect(account.network)}>
                    {t('admin.socialPosts.accounts.disconnect')}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy !== null || !canConnectAccount(account)}
                  isLoading={busy === account.network}
                  onClick={() => void onConnect(account.network)}
                >
                  {t(account.status === null ? 'admin.socialPosts.accounts.connect' : 'admin.socialPosts.accounts.reconnect')}
                </Button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** The result the backend reported after the OAuth round trip; shown once, until dismissed or the page is left. */
export function SocialConnectionNotice({ notice, onDismiss }: { notice: ConnectionResult | null; onDismiss: () => unknown }) {
  const { t } = useTranslation()
  if (!notice) return null
  const connected = notice.outcome === 'connected'
  const network = notice.network ? t(`admin.socialPosts.networks.${notice.network}`) : null
  const message = connected
    ? t('admin.socialPosts.accounts.resultConnected', { network })
    : network ? t('admin.socialPosts.accounts.resultError', { network }) : t('admin.socialPosts.accounts.resultErrorUnknown')
  return (
    <div
      role={connected ? 'status' : 'alert'}
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${connected ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}
    >
      <p>{message}</p>
      <Button variant="ghost" size="sm" onClick={() => void onDismiss()}>{t('admin.socialPosts.accounts.dismiss')}</Button>
    </div>
  )
}
