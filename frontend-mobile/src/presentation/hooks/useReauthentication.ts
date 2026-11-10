import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Platform } from 'react-native'
import {
  reauthenticationService,
  type ReauthenticationProvider,
} from '@/application/services/reauthentication.service'
import { socialAuthService } from '@/application/services/socialAuth.service'
import { useAuthStore } from '@/presentation/store/auth.store'

/** Apple Sign In is native on iOS only; Google works on both platforms. */
function availableProviders(): readonly ReauthenticationProvider[] {
  return Platform.OS === 'ios' ? ['GOOGLE', 'APPLE'] : ['GOOGLE']
}

export function useReauthentication() {
  const open = useSyncExternalStore(reauthenticationService.subscribe, reauthenticationService.isRequired, reauthenticationService.isRequired)
  const generation = useAuthStore(state => state.sessionGeneration)
  const linked = useAuthStore(state => state.user?.socialProviders)
  const providers = availableProviders().filter(provider => linked?.includes(provider))
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
  const confirmWithProvider = (provider: ReauthenticationProvider) => run(provider, async () => {
    const { token, nonce } = await socialAuthService.acquire(provider)
    await reauthenticationService.confirmWithProvider({ provider, token, nonce })
  })
  return { open, busy, busyProvider, failed, failedProvider, providers, cancel, confirm, confirmWithProvider }
}
