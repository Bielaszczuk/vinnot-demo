/**
 * WineScanPage — mobile app download gate
 *
 * Web version shows a smooth callout and store download actions.
 */
import { useTranslation } from 'react-i18next'
import { Smartphone } from 'lucide-react'
import { Icon } from '@components/ui/Icon'
import { appDownloads } from '@/shared/config/appDownloads'

export function WineScanPage() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface-cream via-white to-wine-50/60 p-6 shadow-xl shadow-wine-950/5 sm:p-10">
        <div className="pointer-events-none absolute -left-16 -top-12 h-56 w-56 rounded-full bg-wine-200/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-rating/10 blur-3xl" />

        <div className="relative text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-wine-100 bg-white/90 px-4 py-1.5 text-xs font-semibold text-wine-800 shadow-sm">
            <Icon icon={Smartphone} size="xs" />
            {t('scan.mobile.exclusiveBadge')}
          </div>
          <h1 className="mx-auto mb-3 max-w-2xl text-2xl font-semibold tracking-tight text-ink sm:text-4xl">
            {t('scan.mobile.title')}
          </h1>
          <p className="mx-auto mb-7 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
            {t('scan.mobile.description')}
          </p>
        </div>

        <div className="relative mx-auto mb-8 max-w-sm rounded-3xl border border-border bg-white/90 p-4 shadow-2xl shadow-wine-950/10 backdrop-blur">
          <div className="mx-auto mb-3 h-1.5 w-20 rounded-full bg-gray-200" />
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-wine-950 to-wine-900 p-5">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-2xs font-medium text-white/90">
              <span className="h-1.5 w-1.5 rounded-full bg-wine-300" />
              {t('scan.mobile.realtime')}
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-4 text-left">
              <p className="text-xs text-white/70">{t('scan.mobile.detectedLabel')}</p>
              <p className="mt-1 text-sm font-semibold text-white">{t('scan.mobile.detectedExample')}</p>
              <p className="mt-2 text-2xs text-white/75">{t('scan.mobile.detectedDescription')}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <span className="rounded-full bg-wine-50 px-2.5 py-1 text-2xs font-medium text-wine-800 ring-1 ring-wine-100">{t('scan.mobile.featureNativeCamera')}</span>
            <span className="rounded-full bg-wine-50 px-2.5 py-1 text-2xs font-medium text-wine-800 ring-1 ring-wine-100">{t('scan.mobile.featurePrecision')}</span>
            <span className="rounded-full bg-wine-50 px-2.5 py-1 text-2xs font-medium text-wine-800 ring-1 ring-wine-100">{t('scan.mobile.featureFastResponse')}</span>
          </div>
        </div>

        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
          <a
            href={appDownloads.ios}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${t('scan.mobile.downloadOn')} ${t('scan.mobile.appStore')}`}
            className="mx-auto inline-flex h-14 items-center transition-transform duration-200 hover:-translate-y-0.5 sm:ml-auto sm:mr-0"
          >
            <img src="/share-assets/app-store.svg" alt="" width={168} height={56} className="h-14 w-auto" />
          </a>
          <a
            href={appDownloads.android}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${t('scan.mobile.availableOn')} ${t('scan.mobile.googlePlay')}`}
            className="mx-auto inline-flex h-14 items-center transition-transform duration-200 hover:-translate-y-0.5 sm:ml-0 sm:mr-auto"
          >
            {/* Google's badge carries its own transparent margin, so it is drawn taller to match the App Store one. */}
            <img src="/share-assets/google-play.png" alt="" width={209} height={81} className="-my-[12.5px] h-[81px] w-auto max-w-none" />
          </a>
        </div>

        <div className="mt-5 text-center">
          <p className="text-xs text-gray-500">
            {t('scan.mobile.desktopUnavailable')}
          </p>
          <p className="mt-1 text-xs font-medium text-gray-700">
            {t('scan.mobile.openOnPhone')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default WineScanPage
