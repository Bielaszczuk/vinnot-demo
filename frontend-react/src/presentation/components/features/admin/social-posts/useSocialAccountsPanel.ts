/**
 * The network connections panel (#510 S5): the connections, connect (leaves for the network's OAuth page) and
 * disconnect, and the one-time notice of the OAuth return, whose query parameters are then removed from the URL.
 */
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '@hooks/useToast'
import { useAdminSocialAccounts, useConnectSocialAccount, useDisconnectSocialAccount } from '@hooks/queries/admin/useAdminSocialAccounts'
import { socialAccountError } from '@services/adminSocialAccounts.service'
import { parseConnectionResult, type ConnectionResult } from '@domain/admin/socialAccount'
import type { SocialNetwork } from '@domain/admin/socialPost'

const RETURN_PARAMS = ['account', 'result'] as const

export function useSocialAccountsPanel() {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [notice, setNotice] = useState<ConnectionResult | null>(
    () => parseConnectionResult(searchParams.get('account'), searchParams.get('result')),
  )
  const query = useAdminSocialAccounts()
  const connectMutation = useConnectSocialAccount()
  const disconnectMutation = useDisconnectSocialAccount()

  useEffect(() => {
    if (!RETURN_PARAMS.some((param) => searchParams.has(param))) return
    const next = new URLSearchParams(searchParams)
    RETURN_PARAMS.forEach((param) => next.delete(param))
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const fail = useCallback((error: unknown) => {
    addToast({ type: 'error', message: t(`admin.socialPosts.accounts.errors.${socialAccountError(error)}`) })
  }, [addToast, t])

  const connect = useCallback(async (network: SocialNetwork) => {
    try {
      await connectMutation.mutateAsync(network)
    } catch (error) {
      fail(error)
    }
  }, [connectMutation, fail])

  const disconnect = useCallback(async (network: SocialNetwork) => {
    try {
      await disconnectMutation.mutateAsync(network)
      addToast({ type: 'success', message: t('admin.socialPosts.accounts.disconnected', { network: t(`admin.socialPosts.networks.${network}`) }) })
    } catch (error) {
      fail(error)
    }
  }, [addToast, disconnectMutation, fail, t])

  // A successful connect is already leaving for the network, so its row stays busy until the page unloads.
  const connecting = connectMutation.isPending || connectMutation.isSuccess ? connectMutation.variables ?? null : null
  const busy = connecting ?? (disconnectMutation.isPending ? disconnectMutation.variables ?? null : null)

  return {
    accounts: query.data ?? [],
    loading: query.isLoading,
    failed: query.isError,
    refetch: query.refetch,
    busy,
    notice,
    dismissNotice: () => setNotice(null),
    connect,
    disconnect,
  }
}
