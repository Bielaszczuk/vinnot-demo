import { CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@components/ui/Icon'
import { LinkButton } from '@components/ui/LinkButton'
import { usePaymentAccountStatus } from '@/presentation/hooks/usePaymentAccountStatus'
import { formatNumber } from '@/shared/utils/format'

export function PaymentAccountStatus() {
  const { t } = useTranslation()
  const account = usePaymentAccountStatus()
  const connected = account.data?.connected === true
  const percent = account.data?.commissionPercent
  return (
    <div className="space-y-3">
      {typeof percent === 'number' && (
        <p className="text-sm text-gray-600">
          {t('eventEditor.commissionRate', {
            rate: formatNumber(percent, { maximumFractionDigits: 2 }),
          })}
        </p>
      )}
      {connected ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-success/20 bg-success-soft p-4"
        >
          <Icon icon={CheckCircle2} size="md" className="mt-0.5 text-success" />
          <div>
            <p className="text-sm font-semibold text-success">
              {t('eventEditor.paymentsConnected')}
            </p>
            <p className="mt-1 text-sm text-gray-700">
              {t('eventEditor.paymentsConnectedDetail')}
            </p>
          </div>
        </div>
      ) : (
        <p role="status" className="text-sm text-gray-600">
          {t(
            account.isLoading
              ? 'eventEditor.checkingPayments'
              : account.isError
                ? 'eventEditor.paymentsStatusError'
                : 'eventEditor.connectPaymentsWeb',
          )}
        </p>
      )}
      {!account.isLoading && (
        <LinkButton href="/partner/payments" external variant="link">
          {t(
            connected
              ? 'eventEditor.reconnectPayments'
              : 'eventEditor.connectPayments',
          )}
        </LinkButton>
      )}
    </div>
  )
}
