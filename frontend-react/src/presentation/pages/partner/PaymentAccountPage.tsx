import { CheckCircle2 } from 'lucide-react'
import {
  AuthActionLayout,
  AuthActionMessage,
} from '@components/auth/AuthActionLayout'
import { Button } from '@components/ui/Button'
import { Icon } from '@components/ui/Icon'
import { LinkButton } from '@components/ui/LinkButton'
import { PageLoader } from '@components/ui/PageLoader'
import { usePaymentAccountConnection } from '@hooks/usePaymentAccountConnection'

export function PaymentAccountPage() {
  const vm = usePaymentAccountConnection()
  return (
    <AuthActionLayout
      title={vm.t('payments.title')}
      description={vm.t('payments.description')}
    >
      {vm.environment && vm.environment !== 'LIVE' && (
        <p className="mb-5 rounded-xl bg-wine-50 p-4 text-sm leading-6 text-wine-800">
          {vm.t(
            vm.environment === 'LIVE_PILOT'
              ? 'payments.livePilot'
              : 'payments.sandbox',
          )}
        </p>
      )}
      {vm.callbackPage ? (
        <div className="space-y-5" aria-live="polite">
          {vm.status === 'loading' && (
            <PageLoader compact label={vm.t('payments.finishing')} />
          )}
          <AuthActionMessage status={vm.status} message={vm.message} />
          {vm.status === 'success' && (
            <p className="text-sm leading-6 text-gray-600">
              {vm.t('payments.ready')}
            </p>
          )}
          {vm.returnToApp && (
            <Button className="w-full" onClick={vm.openApp}>
              {vm.t('payments.returnToApp')}
            </Button>
          )}
          {vm.status === 'error' && (
            <LinkButton variant="secondary" className="w-full" to="/partner/payments">
              {vm.t('payments.retry')}
            </LinkButton>
          )}
          <div className="text-center">
            <LinkButton variant="link" to="/partner/events">
              {vm.t('payments.back')}
            </LinkButton>
          </div>
        </div>
      ) : vm.isInitializing ? (
        <PageLoader compact />
      ) : !vm.allowed ? (
        <>
          <p className="text-sm leading-6 text-gray-600">
            {vm.t('payments.signInRequired')}
          </p>
          <LinkButton className="mt-5 w-full" to="/login?returnUrl=%2Fpartner%2Fpayments">
            {vm.t('auth.login')}
          </LinkButton>
        </>
      ) : (
        <div className="space-y-5">
          {vm.commissionRate && (
            <p className="text-sm leading-6 text-gray-600">
              {vm.t('payments.commission', { rate: vm.commissionRate })}
            </p>
          )}
          <AuthActionMessage status={vm.status} message={vm.message} />
          {vm.connected ? (
            <div
              role="status"
              className="flex items-center gap-3 rounded-xl border border-success/20 bg-success-soft p-4 text-sm font-medium text-success"
            >
              <Icon icon={CheckCircle2} size="md" />
              {vm.t('eventEditor.paymentsConnected')}
            </div>
          ) : (
            <p className="text-sm font-medium text-gray-800">
              {vm.t('payments.notConnected')}
            </p>
          )}
          <Button
            className="w-full"
            size="lg"
            isLoading={vm.status === 'loading'}
            onClick={() => void vm.connect()}
          >
            {vm.t(
              vm.connected
                ? 'eventEditor.reconnectPayments'
                : 'payments.connect',
            )}
          </Button>
          <div className="text-center">
            <LinkButton variant="link" to="/partner/events">
              {vm.t('payments.back')}
            </LinkButton>
          </div>
        </div>
      )}
    </AuthActionLayout>
  )
}
