/**
 * WineComparePage - Compare wines side by side
 *
 * React parity implementation aligned with Vue WineComparePage.vue.
 */

import { CompareLoadingSteps } from '@components/features/wine'
import { useEffect, useRef } from 'react'
import { ArrowLeft, Check, Coins, FileText, Gavel, Info, Lightbulb, Scale, Sparkles, X } from 'lucide-react'
import { Button } from '@components/ui/Button'
import { Icon } from '@components/ui/Icon'
import { PageBanner } from '@components/ui/PageBanner'
import { formatWineDisplayName } from '@utils/wine'
import { useWineCompareViewModel } from './useWineCompareViewModel'
import { WineCompareSelectionCard } from './WineCompareSelectionCard'
import { WineCompareSearchModal } from './WineCompareSearchModal'
import { CompareSection } from './compare/CompareSection'
import { CompareTastingNotesSection } from './compare/CompareTastingNotesSection'
import { CompareChooseIfSection } from './compare/CompareChooseIfSection'
import { ComparePairingsSection } from './compare/ComparePairingsSection'
import { CompareServingAgingSection } from './compare/CompareServingAgingSection'

export function WineComparePage() {
  const {
    t,
    compareOrigin,
    wineA,
    wineB,
    loadingComparison,
    comparisonError,
    retryComparison,
    comparison,
    isCached,
    keyDifferences,
    searchModalOpen,
    setSearchModalOpen,
    searchInputRef,
    searchListRef,
    searchQuery,
    updateSearchQuery,
    searchPage,
    searchingFirstPage,
    searching,
    searchResults,
    openSearchModal,
    onSearchScroll,
    selectWine,
    clearAll,
    goToWineDetails,
    backToOrigin,
    barWidth,
    wineALabel,
    wineBLabel,
    hasRichContent,
    summaryIntro,
    verdict,
    chooseIfByWine,
  } = useWineCompareViewModel()
  const journeyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (loadingComparison) {
      journeyRef.current?.scrollIntoView?.({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
    }
  }, [loadingComparison])

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <PageBanner
        className="mb-8"
        title={t('compare.title')}
        subtitle={t('compare.subtitle')}
        back={compareOrigin?.fromPath && compareOrigin.fromWineId ? (
          <Button variant="onDark" size="sm" onClick={backToOrigin} leftIcon={<Icon icon={ArrowLeft} />}>
            {t('common.back')}
          </Button>
        ) : undefined}
        actions={(wineA || wineB) ? (
          <Button variant="onDark" size="sm" onClick={clearAll} leftIcon={<Icon icon={X} />}>
            {t('compare.clearAll')}
          </Button>
        ) : undefined}
      />

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        <WineCompareSelectionCard
          variant="A"
          wine={wineA}
          t={t}
          onOpenSearch={() => openSearchModal('A')}
          onOpenWineDetails={goToWineDetails}
        />
        <WineCompareSelectionCard
          variant="B"
          wine={wineB}
          t={t}
          disabled={!wineA}
          onOpenSearch={() => openSearchModal('B')}
          onOpenWineDetails={goToWineDetails}
        />
      </div>

      {loadingComparison && <div ref={journeyRef} className="scroll-mt-24"><CompareLoadingSteps firstType={wineA?.type} secondType={wineB?.type} /></div>}

      {comparisonError && !loadingComparison && (
        <div role="alert" className="mb-6 rounded-2xl border border-danger/20 bg-danger-soft p-5 text-sm text-ink">
          <p>{t('compare.loadError')}</p>
          <Button variant="secondary" size="sm" onClick={retryComparison} className="mt-3">
            {t('common.retry')}
          </Button>
        </div>
      )}

      {!loadingComparison && comparison && (
        <>
          {isCached && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-info/15 bg-info-soft px-4 py-2.5">
              <Icon icon={Info} className="text-info" />
              <span className="text-xs font-medium text-info">{t('compare.cachedResult')}</span>
            </div>
          )}

          {summaryIntro && (
            <CompareSection icon={FileText} title={t('compare.summary')}>
              <p className="text-base leading-relaxed text-gray-600">{summaryIntro}</p>
            </CompareSection>
          )}

          {comparison.attributeComparison?.attributes?.length ? (
            <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              <div className="grid grid-cols-3 border-b border-gray-100 bg-gradient-to-r from-wine-50/60 via-surface-cream to-gray-50/60">
                <div className="p-4 text-right">
                  <p className="truncate text-sm font-bold text-wine-700">
                    {formatWineDisplayName(wineA?.name ?? '', wineA?.grapeVarieties)}
                  </p>
                  <p className="text-2xs text-gray-500">{wineA?.winery}</p>
                </div>
                <div className="flex items-center justify-center border-x border-gray-100 p-4">
                  <span className="text-2xs font-bold uppercase tracking-widest text-gray-500">
                    {t('compare.attributes')}
                  </span>
                </div>
                <div className="p-4 text-left">
                  <p className="truncate text-sm font-bold text-gray-700">
                    {formatWineDisplayName(wineB?.name ?? '', wineB?.grapeVarieties)}
                  </p>
                  <p className="text-2xs text-gray-500">{wineB?.winery}</p>
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {comparison.attributeComparison.attributes.map((attr, idx) => (
                  <div key={`${attr.name}-${idx}`} className="group grid grid-cols-3 transition-colors hover:bg-gray-50/50">
                    <div className="flex items-center justify-end gap-2 p-3">
                      <span className="hidden truncate text-xs text-gray-500 sm:block">{attr.wineAValue}</span>
                      <div className="flex h-7 max-w-[140px] flex-1 items-center justify-end">
                        <div
                          className="flex h-5 items-center justify-start rounded-l-full bg-gradient-to-l from-wine-700 to-wine-500 pl-2 transition-all duration-1000 ease-out motion-reduce:transition-none"
                          style={{ width: barWidth(attr.wineAScore) }}
                        >
                          {(attr.wineAScore || 0) > 25 && (
                            <span className="text-2xs font-bold text-white">{attr.wineAScore}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center border-x border-gray-50 p-3">
                      <span className="text-xs font-semibold text-gray-700">{attr.name}</span>
                    </div>

                    <div className="flex items-center gap-2 p-3">
                      <div className="flex h-7 max-w-[140px] flex-1 items-center">
                        <div
                          className="flex h-5 items-center justify-end rounded-r-full bg-gradient-to-r from-gray-400 to-gray-500 pr-2 transition-all duration-1000 ease-out motion-reduce:transition-none"
                          style={{ width: barWidth(attr.wineBScore) }}
                        >
                          {(attr.wineBScore || 0) > 25 && (
                            <span className="text-2xs font-bold text-white">{attr.wineBScore}</span>
                          )}
                        </div>
                      </div>
                      <span className="hidden truncate text-xs text-gray-500 sm:block">{attr.wineBValue}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {comparison.tastingNotes && (
            <CompareTastingNotesSection t={t} notes={comparison.tastingNotes} wineALabel={wineALabel} wineBLabel={wineBLabel} />
          )}

          {(keyDifferences.length > 0 || (comparison.similarities?.length ?? 0) > 0) && (
            <div className="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-wine-50 text-wine-700">
                  <Icon icon={Scale} />
                </div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-ink">
                  {t('compare.keyDifferences')}
                </h2>
              </div>

              {keyDifferences.length > 0 && (
                <div className="space-y-3">
                  {keyDifferences.map((diff, index) => (
                    <div key={`${diff}-${index}`} className="flex items-start gap-3 rounded-xl bg-surface-cream p-3">
                      <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-wine-50 ring-1 ring-wine-100">
                        <span className="text-2xs font-bold text-wine-700">{index + 1}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-gray-700">{diff}</p>
                    </div>
                  ))}
                </div>
              )}

              {comparison.similarities?.length ? (
                <div className="mt-5 border-t border-gray-100 pt-5">
                  <p className="mb-3 text-2xs font-semibold uppercase tracking-wider text-gray-500">
                    {t('compare.similarities')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {comparison.similarities.map((similarity, index) => (
                      <span
                        key={`${similarity}-${index}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-surface-cream px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-border"
                      >
                        <Icon icon={Check} size="xs" className="text-wine-700" />
                        {similarity}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {chooseIfByWine && (
            <CompareChooseIfSection t={t} chooseIf={chooseIfByWine} wineALabel={wineALabel} wineBLabel={wineBLabel} />
          )}

          {comparison.bestFor && (
            <div className="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-wine-50 text-wine-700">
                  <Icon icon={Sparkles} />
                </div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-ink">
                  {t('compare.bestFor')}
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-wine-50/50 p-4 ring-1 ring-wine-100/60">
                  <p className="mb-2 truncate text-xs font-bold text-wine-700">
                    {formatWineDisplayName(wineA?.name ?? '', wineA?.grapeVarieties)}
                  </p>
                  <ul className="space-y-1.5">
                    {comparison.bestFor.wineA.map((occasion, index) => (
                      <li key={`${occasion}-${index}`} className="flex items-start gap-2 text-sm text-gray-700">
                        <Icon icon={Check} className="mt-0.5 text-wine-700" />
                        <span>{occasion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl bg-gray-50/80 p-4 ring-1 ring-gray-100">
                  <p className="mb-2 truncate text-xs font-bold text-gray-600">
                    {formatWineDisplayName(wineB?.name ?? '', wineB?.grapeVarieties)}
                  </p>
                  <ul className="space-y-1.5">
                    {comparison.bestFor.wineB.map((occasion, index) => (
                      <li key={`${occasion}-${index}`} className="flex items-start gap-2 text-sm text-gray-700">
                        <Icon icon={Check} className="mt-0.5 text-gray-500" />
                        <span>{occasion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {comparison.pairings && (
            <ComparePairingsSection t={t} pairings={comparison.pairings} wineALabel={wineALabel} wineBLabel={wineBLabel} />
          )}

          {(comparison.serving || comparison.aging) && (
            <CompareServingAgingSection
              t={t}
              serving={comparison.serving}
              aging={comparison.aging}
              wineALabel={wineALabel}
              wineBLabel={wineBLabel}
            />
          )}

          {comparison.value && (
            <CompareSection icon={Coins} title={t('compare.value')}>
              <p className="text-sm leading-relaxed text-gray-600">{comparison.value}</p>
            </CompareSection>
          )}

          {(comparison.recommendation ||
            comparison.summary ||
            comparison.recommendationWineA ||
            comparison.recommendationWineB) && (
            <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-wine-950 to-wine-900 p-6 shadow-lg md:p-8">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-wine-500/25 blur-3xl" />
                <div className="absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-rating/15 blur-3xl" />
              </div>

              <div className="relative">
                <div className="mb-5 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-wine-200 backdrop-blur-sm">
                    <Icon icon={Lightbulb} />
                  </div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-wine-200">
                    {t('compare.aiRecommendation')}
                  </h2>
                </div>

                {(comparison.recommendationWineA || comparison.recommendationWineB) && (
                  <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {comparison.recommendationWineA && (
                      <div className="rounded-xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm">
                        <p className="mb-2 text-2xs font-bold uppercase tracking-widest text-wine-200">
                          {formatWineDisplayName(wineA?.name ?? '', wineA?.grapeVarieties)}
                        </p>
                        <p className="text-sm leading-relaxed text-white/85">{comparison.recommendationWineA}</p>
                      </div>
                    )}
                    {comparison.recommendationWineB && (
                      <div className="rounded-xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm">
                        <p className="mb-2 text-2xs font-bold uppercase tracking-widest text-wine-200">
                          {formatWineDisplayName(wineB?.name ?? '', wineB?.grapeVarieties)}
                        </p>
                        <p className="text-sm leading-relaxed text-white/85">{comparison.recommendationWineB}</p>
                      </div>
                    )}
                  </div>
                )}

                {verdict && (hasRichContent ? (
                  <div
                    role="note"
                    aria-label={t('compare.verdict')}
                    className="rounded-xl bg-white/15 p-5 ring-1 ring-rating/40 backdrop-blur-sm"
                  >
                    <p className="mb-2 flex items-center gap-1.5 text-2xs font-bold uppercase tracking-widest text-rating">
                      <Icon icon={Gavel} size="xs" />
                      {t('compare.verdict')}
                    </p>
                    <p className="text-base leading-relaxed text-white">{verdict}</p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm">
                    <p className="text-sm leading-relaxed text-white/90">{verdict}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <WineCompareSearchModal
        open={searchModalOpen}
        t={t}
        searchInputRef={searchInputRef}
        searchListRef={searchListRef}
        searchQuery={searchQuery}
        onSearchChange={updateSearchQuery}
        onSearchScroll={onSearchScroll}
        searchingFirstPage={searchingFirstPage}
        searching={searching}
        searchPage={searchPage}
        searchResults={searchResults}
        onSelectWine={selectWine}
        onClose={() => setSearchModalOpen(false)}
      />
    </div>
  )
}
