import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { reauthenticationService, type ReauthenticationProvider } from '@services/reauthentication.service'
import { socialAuthService } from '@services/socialAuth.service'
import { useAuthStore } from '@stores/auth.store'

const PROVIDERS: readonly ReauthenticationProvider[] = ['GOOGLE', 'APPLE']

export function useReauthentication() {
  const open = useSyncExternalStore(reauthenticationService.subscribe, reauthenticationService.isRequired, reauthenticationService.isRequired)
  const generation = useAuthStore(state => state.sessionGeneration)
  const linked = useAuthStore(state => state.user?.socialProviders)
  const providers = PROVIDERS.filter(provider => linked?.includes(provider))
  const [busy, setBusy] = useState(false)
  const [busyProvider, setBusyProvider] = useState<ReauthenticationProvider | null>(null)
  const [failed, setFailed] = useState(false)
  const [failedProvider, setFailedProvider] = useState<ReauthenticationProvider | null>(null)
  const operation = useRef(0)
  const cancel = useCallback(() => {
    operation.current++
    reauthenticationService.cancel()
    setBusy(false)
    setBusyProvider(null)
    setFailed(false)
    setFailedProvider(null)
  }, [])
  useEffect(() => cancel, [generation, cancel])
  const run = async (provider: ReauthenticationProvider | null, confirmation: () => Promise<void>) => {
    const started = ++operation.current
    setBusy(true)
    setBusyProvider(provider)
    setFailed(false)
    setFailedProvider(null)
    try { await confirmation() }
    catch { if (started === operation.current) { if (provider) setFailedProvider(provider); else setFailed(true) } }
    finally { if (started === operation.current) { setBusy(false); setBusyProvider(null) } }
  }
  const confirm = (password: string) => run(null, () => reauthenticationService.confirm(password))
  const confirmWithGoogle = (token: string) =>
    run('GOOGLE', () => reauthenticationService.confirmWithProvider({ provider: 'GOOGLE', token }))
  const confirmWithApple = () => run('APPLE', async () => {
    const { token, nonce } = await socialAuthService.acquire('APPLE')
    await reauthenticationService.confirmWithProvider({ provider: 'APPLE', token, nonce })
  })
  const providerFailed = (provider: ReauthenticationProvider) => {
    setFailed(false)
    setFailedProvider(provider)
  }
  return {
    open, busy, busyProvider, failed, failedProvider, providers,
    cancel, confirm, confirmWithGoogle, confirmWithApple, providerFailed,
  }
}
