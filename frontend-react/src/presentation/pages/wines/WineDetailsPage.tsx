/**
 * WineDetailsPage — full wine detail view
 *
 * Matches the Vue design: hero card with image + info, AI sommelier card,
 * details grid (description, wine info table, food pairings, taste profile, grape pills),
 * reviews section, and inline cellar modal.
 */
import { ArrowLeft, Check, ChevronRight, Grape, Lightbulb, MapPin, Plus, Scale, Share2, ShieldAlert, Sparkles, SquarePen, Warehouse, Wine } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@components/ui/Button'
import { EmptyState } from '@components/ui/EmptyState'
import { Icon } from '@components/ui/Icon'
import { ImageWithFallback } from '@components/ui/ImageWithFallback'
import { LinkButton } from '@components/ui/LinkButton'
import { PageLoader } from '@components/ui/PageLoader'
import { QueryErrorState } from '@components/ui/QueryErrorState'
import { GlassRating } from '@components/ui/rating/GlassRating'
import { formatDecimal, formatPrice } from '@utils/format'
import { ReviewsList, WineTasteProfile } from '@components/features/wine'
import { wineDefaultImage } from '@utils/wine'
import { useWineDetailsViewModel } from './useWineDetailsViewModel'
import { WineCellarModal } from './WineCellarModal'

export function WineDetailsPage() {
  const {
    t,
    shareWine,
    focusOwnReview,
    hasOwnReview,
    openReviews,
    reviewsSectionRef,
    reviewRequest,
    pinOwnReview,
    id,
    wine,
    typeLabel,
    isLoading,
    loadFailed,
    loadError,
    retry,
    isAuthenticated,
    isInCellar,
    aiProfileExists,
    showCellarModal,
    setShowCellarModal,
    addingToCellar,
    cellarForm,
    setCellarForm,
    hasTasteScores,
    goBack,
    goToCellar,
    confirmAddToCellar,
  } = useWineDetailsViewModel()

  /* ── render ──────────────────────────────────────────── */

  if (isLoading) return <PageLoader />

  if (loadFailed) {
    return (
      <div className="py-20">
        <QueryErrorState error={loadError} onRetry={retry} />
      </div>
    )
  }

  if (!wine) {
    return (
      <EmptyState
        illustration="notFound"
        title={t('wineDetails.notFound')}
        action={<LinkButton to="/wines" variant="secondary">{t('wineDetails.browseCatalog')}</LinkButton>}
      />
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={goBack} className="mb-4 -ml-2 sm:mb-6" leftIcon={<Icon icon={ArrowLeft} />}>
        {t('common.back')}
      </Button>

      {/* ═══════ HERO SECTION — Image + Main Info ═══════ */}
      <div className="mb-4 overflow-hidden rounded-xl border border-border bg-white shadow-sm sm:mb-6 sm:rounded-2xl">
        <div className="flex flex-col md:flex-row">
          {/* Image */}
          <div className="flex flex-shrink-0 items-center justify-center bg-gradient-to-br from-surface-cream to-gray-100 p-4 sm:p-6 md:w-64 md:p-8 lg:w-72">
            <ImageWithFallback
              src={wine.imageUrl?.trim() || wineDefaultImage(wine.type)}
              fallbackSrc={wineDefaultImage(wine.type)}
              alt=""
              className="max-h-56 w-auto rounded-lg object-contain drop-shadow-lg sm:max-h-72 md:max-h-80"
            />
          </div>

          {/* Main info */}
          <div className="flex flex-1 flex-col justify-center p-4 sm:p-6 md:p-8">
            {/* Type & Vintage pills */}
            <div className="mb-3">
              <span className="inline-flex items-center rounded-full bg-wine-100 px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wider text-wine-700 ring-1 ring-wine-200/60">
                {typeLabel}
              </span>
              {wine.vintage && (
                <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-2xs font-semibold text-gray-600 ring-1 ring-gray-200/60">
                  {wine.vintage}
                </span>
              )}
            </div>

            {/* Name */}
            <h1 className="text-xl font-semibold leading-tight tracking-tight text-ink sm:text-2xl lg:text-3xl">{wine.name}</h1>

            {/* Grape varieties */}
            {wine.grapeVarieties && wine.grapeVarieties.length > 0 && (
              <p className="mt-1.5 text-sm font-medium text-wine-700">{wine.grapeVarieties.join(' · ')}</p>
            )}

            {/* Winery */}
            <div className="mt-2">
              {wine.wineryId ? (
                <Link to={`/wineries/${wine.wineryId}`} className="text-sm text-gray-500 transition-colors hover:text-wine-700">
                  {wine.winery}
                </Link>
              ) : (
                <p className="text-sm text-gray-500">{wine.winery}</p>
              )}
            </div>

            {/* Region */}
            <p className="mt-1 text-xs text-gray-500">
              {wine.region}{wine.country ? `, ${wine.country}` : ''}
            </p>

            {/* Rating */}
            <div className="mt-4 flex items-center gap-2.5">
              {wine.reviewCount && wine.reviewCount > 0 ? (
                <>
                  <span className="text-2xl font-semibold text-ink">{formatDecimal(wine.rating ?? 0, 1)}</span>
                  <GlassRating value={wine.rating ?? 0} wineType={wine.type} size={26} />
                  <span className="text-xs text-gray-500">{t('wineDetails.ratingCount', { count: wine.reviewCount })}</span>
                </>
              ) : (
                <span className="text-xs text-gray-500">{t('wineDetails.noRatings')}</span>
              )}
            </div>

            {/* Stats row: Price + Alcohol */}
            <div className="mt-5 flex items-center gap-6 border-t border-gray-100 pt-5">
              {wine.price != null && (
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold text-ink">{formatPrice(wine.price)}</span>
                  <span className="text-xs text-gray-500">{t('wines.price')}</span>
                </div>
              )}
              {wine.price != null && wine.alcoholContent != null && (
                <div className="h-8 w-px bg-gray-200" />
              )}
              {wine.alcoholContent != null && (
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold text-ink">{wine.alcoholContent}%</span>
                  <span className="text-xs text-gray-500">{t('wineDetails.alcohol')}</span>
                </div>
              )}
            </div>

            {/* Action buttons: an even 2x2 grid on phones (the two primary actions first), one row from sm up. */}
            <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              {isAuthenticated && isInCellar && (
                <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={goToCellar} leftIcon={<Icon icon={Check} />}>
                  {t('wineDetails.inCellar')}
                </Button>
              )}
              {isAuthenticated && !isInCellar && (
                <Button size="sm" className="w-full sm:w-auto" onClick={() => setShowCellarModal(true)} leftIcon={<Icon icon={Plus} />}>
                  {t('wineDetails.addToCellar')}
                </Button>
              )}
              {/* Signed out there is no cellar action, so the review shortcut takes the whole first row. */}
              <Button
                variant="outline"
                size="sm"
                className={isAuthenticated ? 'w-full sm:w-auto' : 'col-span-2 w-full sm:w-auto'}
                onClick={openReviews}
                leftIcon={<Icon icon={SquarePen} />}
              >
                {hasOwnReview ? t('reviews.yourReview') : t('reviews.writeReview')}
              </Button>
              <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => { void shareWine() }} leftIcon={<Icon icon={Share2} />}>
                {t('common.share')}
              </Button>
              <LinkButton
                to={`/wines/compare/${wine.id}`}
                state={{ fromWineId: wine.id, fromPath: `/wines/${wine.id}` }}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                leftIcon={<Icon icon={Scale} />}
              >
                {t('wines.compare')}
              </LinkButton>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ AI SOMMELIER CARD ═══════ */}
      <div className="mb-4 rounded-xl border border-wine-200/60 bg-gradient-to-r from-wine-50 via-surface-cream to-white p-4 shadow-sm sm:mb-6 sm:rounded-2xl sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-wine-700 text-white shadow-sm">
              <Icon icon={Lightbulb} size="md" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">{t('wineDetails.aiSommelier')}</h2>
              <p className="text-xs text-gray-500">
                {aiProfileExists ? t('wineDetails.profileGenerated') : t('wineDetails.consultAi')}
              </p>
            </div>
          </div>
          <LinkButton
            to={aiProfileExists ? `/wines/${wine.id}/ai-profile` : `/wines/${wine.id}/ai-profile?generate=1`}
            variant={aiProfileExists ? 'secondary' : 'primary'}
            size="sm"
            className="w-full flex-shrink-0 sm:w-auto"
            leftIcon={<Icon icon={Sparkles} />}
          >
            {aiProfileExists ? t('wineDetails.viewProfile') : t('wineDetails.generateProfile')}
          </LinkButton>
        </div>
      </div>

      {/* ═══════ DETAILS GRID ═══════ */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:mb-6 sm:gap-6 lg:grid-cols-2">
        {/* Description */}
        {wine.description && (
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">{t('wines.description')}</h3>
            <p className="text-sm leading-relaxed text-gray-600">{wine.description}</p>
            <LinkButton
              to={`/wines/${wine.id}/ai-profile`}
              variant="link"
              className="group mt-4"
              leftIcon={<Icon icon={Sparkles} size="xs" />}
              rightIcon={<Icon icon={ChevronRight} size="xs" className="transition-transform group-hover:translate-x-0.5" />}
            >
              {t('wineDetails.viewFullProfile')}
            </LinkButton>
          </div>
        )}

        {/* Wine Info Table */}
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">{t('wineDetails.wineInfo')}</h3>
          <div className="divide-y divide-gray-100">
            {wine.winery && (
              <div className="flex items-center gap-3 py-2.5">
                <Icon icon={Warehouse} className="text-gray-400" />
                <span className="w-24 text-xs text-gray-500">{t('wines.winery')}</span>
                {wine.wineryId ? (
                  <Link to={`/wineries/${wine.wineryId}`} className="text-xs font-medium text-wine-700 underline-offset-4 hover:underline">{wine.winery}</Link>
                ) : (
                  <span className="text-xs font-medium text-ink">{wine.winery}</span>
                )}
              </div>
            )}
            {wine.grapeVarieties && wine.grapeVarieties.length > 0 && (
              <div className="flex items-center gap-3 py-2.5">
                <Icon icon={Grape} className="text-gray-400" />
                <span className="w-24 text-xs text-gray-500">{t('wines.grapeVariety')}</span>
                <span className="text-xs font-medium text-ink">{wine.grapeVarieties.join(', ')}</span>
              </div>
            )}
            {wine.region && (
              <div className="flex items-center gap-3 py-2.5">
                <Icon icon={MapPin} className="text-gray-400" />
                <span className="w-24 text-xs text-gray-500">{t('wines.region')}</span>
                <span className="text-xs font-medium text-ink">{wine.country} / {wine.region}</span>
              </div>
            )}
            {wine.style && (
              <div className="flex items-center gap-3 py-2.5">
                <Icon icon={Wine} className="text-gray-400" />
                <span className="w-24 text-xs text-gray-500">{t('wines.style')}</span>
                <span className="text-xs font-medium text-ink">{wine.style}</span>
              </div>
            )}
            {wine.allergens && wine.allergens.length > 0 && (
              <div className="flex items-center gap-3 py-2.5">
                <Icon icon={ShieldAlert} className="text-gray-400" />
                <span className="w-24 text-xs text-gray-500">{t('wines.allergens')}</span>
                <span className="text-xs font-medium text-ink">{wine.allergens.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Food Pairings */}
        {wine.foodPairings && wine.foodPairings.length > 0 && (
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">{t('wines.foodPairings')}</h3>
            <div className="flex flex-wrap gap-1.5">
              {wine.foodPairings.map((pairing) => (
                <span key={pairing} className="inline-flex items-center rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-100">
                  {pairing}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Food pairing fallback (string) */}
        {(!wine.foodPairings || wine.foodPairings.length === 0) && wine.foodPairing && (
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">{t('wines.foodPairings')}</h3>
            <p className="text-sm text-gray-600">{wine.foodPairing}</p>
          </div>
        )}

        {/* Taste Profile */}
        {hasTasteScores && (
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">{t('wineDetails.tasteProfile')}</h3>
            <WineTasteProfile wine={wine} />
          </div>
        )}

        {/* Grape Varieties */}
        {wine.grapeVarieties && wine.grapeVarieties.length > 0 && (
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">{t('wines.grapeVariety')}</h3>
            <div className="flex flex-wrap gap-1.5">
              {wine.grapeVarieties.map((grape) => (
                <span key={grape} className="inline-flex items-center rounded-lg bg-wine-50 px-2.5 py-1 text-xs font-medium text-wine-700 ring-1 ring-wine-100">
                  <Icon icon={Grape} className="mr-1" />{grape}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════ REVIEWS SECTION ═══════ */}
      <div ref={reviewsSectionRef} className="scroll-mt-24 rounded-xl border border-border bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6 lg:p-8">
        <ReviewsList wineId={id!} focusOwnReview={focusOwnReview} pinOwnReview={pinOwnReview} writeRequest={reviewRequest}
          catalogVintage={wine.vintage} wineType={wine.type} />
      </div>

      {showCellarModal && (
        <WineCellarModal
          t={t}
          wine={wine}
          cellarForm={cellarForm}
          setCellarForm={setCellarForm}
          addingToCellar={addingToCellar}
          onClose={() => setShowCellarModal(false)}
          onConfirm={confirmAddToCellar}
        />
      )}
    </div>
  )
}
