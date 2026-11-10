import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock3, CircleAlert, Ticket } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { VinnotBrand } from '@/presentation/components/brand/VinnotBrand'
import { Button } from '@/presentation/components/ui/Button'
import { Icon } from '@/presentation/components/ui/Icon'
import { LinkButton } from '@/presentation/components/ui/LinkButton'
import { PageBanner } from '@/presentation/components/ui/PageBanner'
import { illustrations } from '@/shared/illustrations'
import { usePaymentReceipt } from '@/presentation/hooks/queries/event/useMyTickets'

import { useCheckoutReturn } from '@/presentation/hooks/useCheckoutReturn'

/** Public landing. Only authenticated provider evidence can produce a confirmed state. */
export function PaymentReturnPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const { appUrl, startedInApp } = useCheckoutReturn(params.toString())
  const receipt = usePaymentReceipt(params.get('receipt'))
  const status =
    receipt.data ??
    (receipt.isError || !params.get('receipt') ? 'UNAVAILABLE' : 'PENDING')
  const StatusIcon =
    status === 'CONFIRMED'
      ? CheckCircle2
      : status === 'PENDING'
        ? Clock3
        : CircleAlert
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12 text-ink">
      <meta name="referrer" content="no-referrer" />
      <meta name="robots" content="noindex,nofollow" />
      <div className="w-full max-w-lg space-y-4">
        <Link to="/" aria-label="Vinnot" className="mx-auto flex w-fit text-wine-700">
          <VinnotBrand />
        </Link>
        <PageBanner title={t(`tickets.receipt.${status}.title`)} icon={StatusIcon} />
        <section className="rounded-3xl border border-border bg-surface p-8 text-center shadow-sm sm:p-10">
          <img
            src={illustrations.noTickets}
            alt=""
            width={240}
            height={180}
            className="mx-auto h-40 w-56 object-contain"
          />
          <p role="status" className="mt-6 leading-relaxed text-gray-600">
            {t(`tickets.receipt.${status}.body`)}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            {appUrl && (
              <LinkButton href={appUrl} size="lg" className="w-full" leftIcon={<Icon icon={Ticket} size="md" />}>
                {t(startedInApp ? 'tickets.returnToApp' : 'tickets.openInApp')}
              </LinkButton>
            )}
            <LinkButton
              to="/my-tickets"
              variant={appUrl ? 'link' : 'primary'}
              size="lg"
              className={appUrl ? undefined : 'w-full'}
              leftIcon={<Icon icon={Ticket} size={appUrl ? 'sm' : 'md'} />}
            >
              {t(appUrl ? 'tickets.continueWeb' : 'tickets.title')}
            </LinkButton>
          </div>
          <p className="mt-4 text-sm text-gray-500">{t('tickets.privateHint')}</p>
          {status === 'PENDING' && (
            <Button
              variant="link"
              className="mt-5"
              isLoading={receipt.isFetching}
              onClick={() => void receipt.refetch()}
            >
              {t('tickets.refresh')}
            </Button>
          )}
        </section>
      </div>
    </main>
  )
}
