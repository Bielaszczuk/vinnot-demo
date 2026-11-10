/**
 * WineryDetailsPage — winery detail page
 *
 * Shows full winery information: logo, description, location, contact,
 * map embed, and wines belonging to this winery.
 */

import { ArrowLeft, Globe, Mail, MapPin, Phone, Wine } from 'lucide-react'
import { illustrations } from '@shared/illustrations'
import { Button } from '@components/ui/Button'
import { EmptyState } from '@components/ui/EmptyState'
import { Icon } from '@components/ui/Icon'
import { ImageWithFallback } from '@components/ui/ImageWithFallback'
import { LinkButton } from '@components/ui/LinkButton'
import { PageLoader } from '@components/ui/PageLoader'
import { QueryErrorState } from '@components/ui/QueryErrorState'
import { Card } from '@components/ui/Card'
import { GoogleMapsEmbed } from '@components/ui/GoogleMapsEmbed'
import { WineryWineCard } from '@components/features/winery/WineryWineCard'
import { useWineryDetailsViewModel } from './useWineryDetailsViewModel'

export function WineryDetailsPage() {
  const {
    t,
    isLoading,
    loadFailed,
    loadError,
    retry,
    loadingWines,
    wines,
    displayWinery,
    mapQuery,
    websiteUrl,
    emailAddress,
    phoneNumber,
    establishedYear,
    description,
    hasContactInfo,
    locationText,
    goBack,
  } = useWineryDetailsViewModel()

  return (
    <div className="mx-auto max-w-6xl">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={goBack} className="mb-6 -ml-2" leftIcon={<Icon icon={ArrowLeft} />}>
        {t('common.back', 'Volver')}
      </Button>

      {/* Loading */}
      {isLoading && <PageLoader />}

      {/* Load failure: a retry can help */}
      {loadFailed && !isLoading && (
        <div className="py-12">
          <QueryErrorState error={loadError} onRetry={retry} />
        </div>
      )}

      {/* Main content */}
      {displayWinery && !isLoading && (
        <div className="space-y-6">
          {/* ═══════════ HERO CARD ═══════════ */}
          <Card padding="none" className="overflow-hidden">
            <div className="flex flex-col gap-6 p-6 md:flex-row">
              {/* Logo */}
              <div className="flex-shrink-0">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl bg-surface-cream">
                  <ImageWithFallback src={displayWinery.logoUrl ?? undefined} alt="" fallbackSrc={illustrations.winery} className="h-full w-full object-contain" />
                </div>
              </div>

              {/* Main info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-ink">{displayWinery.name}</h1>

                    {locationText && (
                      <div className="mt-2 flex items-center gap-2 text-gray-600">
                        <Icon icon={MapPin} size="md" />
                        <span>{locationText}</span>
                      </div>
                    )}

                    {establishedYear && (
                      <div className="mt-1 text-sm text-gray-500">
                        {t('wineries.established', 'Fundada en')} {establishedYear}
                      </div>
                    )}
                  </div>

                  {websiteUrl && (
                    <LinkButton href={websiteUrl} external variant="secondary" leftIcon={<Icon icon={Globe} />}>
                      {t('wineries.visitWebsite', 'Visitar sitio web')}
                    </LinkButton>
                  )}
                </div>

                {description && (
                  <p className="mt-4 leading-relaxed text-gray-700">{description}</p>
                )}
              </div>
            </div>
          </Card>

          {/* ═══════════ CONTACT & MAP GRID ═══════════ */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact card */}
            <Card>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Icon icon={Phone} className="text-wine-700" /> {t('wineries.contact', 'Contacto')}
              </h3>
              <div className="space-y-3">
                {emailAddress && (
                  <div className="flex items-start gap-3">
                    <Icon icon={Mail} size="md" className="mt-0.5 text-gray-400" />
                    <a href={`mailto:${emailAddress}`} className="text-wine-700 hover:text-wine-800">
                      {emailAddress}
                    </a>
                  </div>
                )}

                {phoneNumber && (
                  <div className="flex items-start gap-3">
                    <Icon icon={Phone} size="md" className="mt-0.5 text-gray-400" />
                    <a href={`tel:${phoneNumber}`} className="text-wine-700 hover:text-wine-800">
                      {phoneNumber}
                    </a>
                  </div>
                )}

                {displayWinery.address && (
                  <div className="flex items-start gap-3">
                    <Icon icon={MapPin} size="md" className="mt-0.5 text-gray-400" />
                    <span className="text-gray-700">{displayWinery.address}</span>
                  </div>
                )}

                {!hasContactInfo && (
                  <p className="text-sm text-gray-500">
                    {t('wineries.noContactInfo', 'No hay información de contacto disponible')}
                  </p>
                )}
              </div>
            </Card>

            {/* Map card */}
            {mapQuery && (
              <Card>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Icon icon={MapPin} className="text-wine-700" /> {t('wineries.location', 'Ubicación')}
                </h3>
                <GoogleMapsEmbed mode="place" query={mapQuery} height="250px" />
              </Card>
            )}
          </div>

          {/* ═══════════ WINERY WINES ═══════════ */}
          <Card>
            <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
              <Icon icon={Wine} className="text-wine-700" /> {t('wineries.wines', 'Vinos de esta bodega')}
            </h3>

            {loadingWines ? (
              <PageLoader compact />
            ) : wines.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {wines.map((wine) => (
                  <WineryWineCard key={wine.id} wine={wine} />
                ))}
              </div>
            ) : (
              <EmptyState illustration="winery" title={t('wineries.noWines', 'Esta bodega aún no tiene vinos publicados')} className="py-8" />
            )}
          </Card>
        </div>
      )}

      {/* Not found */}
      {!displayWinery && !isLoading && !loadFailed && (
        <EmptyState
          illustration="winery"
          title={t('wineries.notFound', 'Bodega no encontrada')}
          action={<LinkButton to="/wines" variant="link">{t('wineDetails.browseCatalog')}</LinkButton>}
        />
      )}
    </div>
  )
}
