import { PaymentConnectionError, type PaymentAccountStatus } from '@/application/ports/PaymentAccount'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from './useAuth'
import { paymentAccountService } from '@/application/services/paymentAccount.instance'
import { ROLES } from '@/shared/config/roles'
import { formatNumber } from '@/shared/utils/format'

export function usePaymentAccountConnection() {
  const { t } = useTranslation()
  const auth = useAuth()
  const allowed = auth.isAuthenticated && auth.hasAnyRole([ROLES.PARTNER, ROLES.ADMIN])
  const [callback] = useState(() => paymentAccountService.readCallback())
  const [callbackFailed] = useState(() => paymentAccountService.callbackFailed())
  const [connection, setConnection] = useState<{ owner?: string } & Partial<PaymentAccountStatus>>({ connected: false })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [returnToApp, setReturnToApp] = useState(false)
  const started = useRef(false)
  const inFlight = useRef(false)
  const owner = auth.user?.id
  const currentOwner = useRef(owner)
  useLayoutEffect(() => { currentOwner.current = owner })

  useEffect(() => { paymentAccountService.clearCallback() }, [])
  // OAuth state identifies the authenticated initiator. No second Vinnot browser login is needed.
  // A ref guards StrictMode's repeated effect setup; codes are never replayed after an unknown outcome.
  useEffect(() => {
    if (started.current || (!callback && !callbackFailed)) return
    started.current = true
    if (!callback) { setStatus('error'); setMessage(t('payments.retryConnection')); return }
    setStatus('loading')
    void paymentAccountService.complete(callback).then(result => {
      setReturnToApp(result.returnToApp)
      setStatus('success')
      setMessage(t('payments.connected'))
      if (result.returnToApp) {
        try { paymentAccountService.returnToApp() } catch { /* Keep the visible return button available. */ }
      }
    }).catch(error => {
      setStatus('error');
      setMessage(t(error instanceof PaymentConnectionError ? `payments.connectionErrors.${error.reason}` : 'payments.retryConnection'));
    })
  }, [callback, callbackFailed, t])

  useEffect(() => {
    let active = true
    if (allowed && !callback && !callbackFailed) {
      void paymentAccountService.status().then(result => {
        if (active) setConnection({ owner, ...result })
      }).catch(() => { if (active) { setStatus('error'); setMessage(t('payments.unavailable')) } })
    }
    return () => { active = false }
  }, [allowed, owner, callback, callbackFailed, t])

  const connect = async () => {
    if (!allowed || inFlight.current) return
    inFlight.current = true
    setStatus('loading'); setMessage(null)
    try { await paymentAccountService.connect() }
    catch { if (currentOwner.current === owner) { setStatus('error'); setMessage(t('payments.unavailable')) } }
    finally { inFlight.current = false }
  }
  const current = connection.owner === owner
  const percent = current ? connection.commissionPercent : null
  return { t, allowed, isInitializing: auth.isInitializing, environment: current ? connection.environment : undefined,
    connected: current && !!connection.connected, status, message, callbackPage: !!callback || callbackFailed,
    commissionRate: typeof percent === 'number' ? formatNumber(percent, { maximumFractionDigits: 2 }) : null,
    returnToApp, openApp: () => paymentAccountService.returnToApp(), connect }
}
