/**
 * AiProfilePage — AI-generated sommelier wine profile
 *
 * Matches the Vue design: dark gradient hero header, color circle indicator,
 * palate analysis with animated score bars, aromatic pills, flavor sections,
 * serving recommendations grid, food pairings, and floating action bar.
 */
import type { ReactNode } from 'react'
import { ArrowLeft, CalendarDays, Check, Clock, Eye, FileText, Flower2, GlassWater, Lightbulb, Sparkles, Thermometer, TriangleAlert, UtensilsCrossed, Wine, type LucideIcon } from 'lucide-react'
import { AiProfileLoadingSteps } from '@components/features/wine/AiProfileLoadingSteps'
import { Button } from '@components/ui/Button'
import { Icon } from '@components/ui/Icon'
import { ImageWithFallback } from '@components/ui/ImageWithFallback'
import { wineDefaultImage, formatWineDisplayName } from '@utils/wine'
import { resolveBarScore } from '@utils/wine-score'
import { sensoryBarWidth } from '@utils/sensory-bar'
import { apiErrorMessage } from '@/presentation/feedback/apiErrorMessage'
import { AiProfileActionBar } from './AiProfileActionBar'
import { useAiProfileViewModel } from './useAiProfileViewModel'
import { WineColorSwatch } from '@/presentation/components/ui/WineColorSwatch'
import { RotatingVignette, type VignetteItem } from '@/presentation/components/ui/RotatingVignette'
import { ServingThermometer } from '@/presentation/components/ui/ServingThermometer'
import { EMPTY_PROFILE_ART_VIEW } from './aiProfileArt'

export function AiProfilePage() {
  const {
    id,
    t,
    wine,
    profile,
    isLoading,
    isError,
    error,
    regeneratePending,
    handleRegenerate,
    goBack,
    palateAnalysis,
    art = EMPTY_PROFILE_ART_VIEW,
  } = useAiProfileViewModel()

  /* ── Loading ──────────────────────────────────────────── */
  if (isLoading || regeneratePending) return <AiProfileLoadingSteps wineType={wine?.type} />

  /* ── No profile yet (the API answers 404 until one is generated) ── */
  if (!isError && !profile) {
    return (
      <div className="mx-auto max-w-5xl pb-24">
        <Button variant="ghost" size="sm" onClick={() => void goBack()} className="mb-6 -ml-2" leftIcon={<Icon icon={ArrowLeft} />}>
          {t('common.back')}
        </Button>
        <div className="rounded-2xl border border-border bg-white py-16 px-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-wine-50 text-wine-700">
            <Icon icon={Lightbulb} size="xl" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-ink">{t('aiProfile.emptyTitle')}</h2>
          <p className="mb-6 text-sm text-gray-500">{t('aiProfile.emptyDescription')}</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => void goBack()}>{t('common.goBack')}</Button>
            {id && <Button onClick={handleRegenerate}>{t('wineDetails.generateProfile')}</Button>}
          </div>
        </div>
      </div>
    )
  }

  /* ── Error ────────────────────────────────────────────── */
  if (isError || !profile) {
    return (
      <div className="mx-auto max-w-5xl pb-24">
        <Button variant="ghost" size="sm" onClick={() => void goBack()} className="mb-6 -ml-2" leftIcon={<Icon icon={ArrowLeft} />}>
          {t('common.back')}
        </Button>
        <div className="rounded-2xl border border-border bg-white py-16 px-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-soft text-danger">
            <Icon icon={TriangleAlert} size="xl" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-ink">{t('aiProfile.errorTitle')}</h2>
          <p className="mb-6 text-sm text-gray-500">{apiErrorMessage(error, t, 'errors.serverErrorDescription')}</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => void goBack()}>{t('common.goBack')}</Button>
            {id && <Button onClick={handleRegenerate}>{t('wineDetails.generateProfile')}</Button>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl pb-24">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => void goBack()} className="mb-6 -ml-2" leftIcon={<Icon icon={ArrowLeft} />}>
          {t('common.back')}
        </Button>

      {/* ═══════ HERO HEADER ═══════ */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-wine-950 to-wine-900 shadow-lg ring-1 ring-white/5">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-wine-500/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-rating/15 blur-3xl" />
        </div>
        <div className="relative flex flex-col items-center gap-6 p-6 md:flex-row md:p-8">
          <div className="flex h-24 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm md:h-28 md:w-24">
            <ImageWithFallback
              src={wine?.imageUrl?.trim() || wineDefaultImage(wine?.type)}
              fallbackSrc={wineDefaultImage(wine?.type)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1 text-center md:text-left">
            <div className="mb-2 flex items-center justify-center gap-2 md:justify-start">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-wine-200 backdrop-blur-sm">
                <Icon icon={Lightbulb} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-wine-200">{t('aiProfile.title')}</span>
            </div>
            <h1 className="truncate text-xl font-semibold leading-tight tracking-tight text-white md:text-2xl">
              {formatWineDisplayName(wine?.name ?? '', wine?.grapeVarieties)}
            </h1>
            <p className="mt-1 text-sm text-gray-300">
              {wine?.winery} · {wine?.vintage || 'NV'} · {wine?.region}, {wine?.country}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════ SUMMARY ═══════ */}
      {profile.summary && (
        <div className="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
          <SectionTitle icon={FileText} title={t('aiProfile.summary')} />
          <p className="text-base leading-relaxed text-gray-600">{profile.summary}</p>
        </div>
      )}

      {/* ═══════ VISUAL + AROMATIC GRID ═══════ */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Visual Analysis */}
        {profile.visualAnalysis && (
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <SectionTitle icon={Eye} title={t('aiProfile.visual.title')} />
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">{t('aiProfile.visual.color')}</span>
                <WineColorSwatch tone={profile.visualColorTone} rim={profile.visualRimTone} intensity={profile.visualColorIntensity} reflections={profile.visualReflectionTones} highlights={profile.visualHighlights} label={profile.visualAnalysis.color} />
                <p className="text-sm font-medium text-ink">{profile.visualAnalysis.color}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-surface-cream p-3">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">{t('aiProfile.visual.clarity')}</span>
                  <p className="mt-0.5 text-sm font-medium text-ink">{profile.visualAnalysis.clarity}</p>
                </div>
                <div className="rounded-xl bg-surface-cream p-3">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">{t('aiProfile.visual.intensity')}</span>
                  <p className="mt-0.5 text-sm font-medium text-ink">{profile.visualAnalysis.intensity}</p>
                </div>
              </div>
              <div className="rounded-xl bg-surface-cream p-3">
                <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">{t('aiProfile.visual.viscosity')}</span>
                <p className="mt-0.5 text-sm font-medium text-ink">{profile.visualAnalysis.viscosity}</p>
              </div>
            </div>
          </div>
        )}

        {/* Aromatic Profile */}
        {profile.aromaticProfile && (
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <SectionTitle icon={Flower2} title={t('aiProfile.aromatic.title')} />
            <div className="space-y-4">
              <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-48 flex-1 space-y-4">
                  <div className="rounded-xl bg-surface-cream p-3">
                    <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">{t('aiProfile.aromatic.intensity')}</span>
                    <p className="mt-0.5 text-sm font-medium text-ink">{profile.aromaticProfile.intensity}</p>
                  </div>
                  <div>
                    <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">{t('aiProfile.aromatic.primaryAromas')}</span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {profile.aromaticProfile.primaryAromas.map((a) => (
                        <span key={a} className="inline-flex items-center rounded-lg bg-wine-50 px-2.5 py-1 text-xs font-medium text-wine-800 ring-1 ring-wine-100">{a}</span>
                      ))}
                    </div>
                  </div>
                  {profile.aromaticProfile.secondaryAromas && profile.aromaticProfile.secondaryAromas.length > 0 && (
                    <div>
                      <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">{t('aiProfile.aromatic.secondaryAromas')}</span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {profile.aromaticProfile.secondaryAromas.map((a) => (
                          <span key={a} className="inline-flex items-center rounded-lg bg-surface-cream px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-border">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <SectionArt testId="aroma-art" items={art.aromas} />
              </div>
              {profile.aromaticProfile.bouquet && (
                <div className="border-t border-gray-100 pt-2">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">{t('aiProfile.aromatic.bouquet')}</span>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">{profile.aromaticProfile.bouquet}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════ PALATE ANALYSIS — Score Bars ═══════ */}
      {palateAnalysis && (
        <div className="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
          <SectionTitle icon={Wine} title={t('aiProfile.palate.title')} />

          {/* Score bars */}
          <div className="mb-6 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            {[
              { key: 'sweetness', label: t('aiProfile.palate.sweetness'), text: palateAnalysis.sweetness, score: palateAnalysis.sweetnessScore },
              { key: 'acidity', label: t('aiProfile.palate.acidity'), text: palateAnalysis.acidity, score: palateAnalysis.acidityScore },
              { key: 'tannin', label: t('aiProfile.palate.tannins'), text: palateAnalysis.tannin, score: palateAnalysis.tanninScore },
              { key: 'body', label: t('aiProfile.palate.body'), text: palateAnalysis.body, score: palateAnalysis.bodyScore },
            ].filter((row) => row.text || row.score != null).map((row) => (
              <PalateBar key={row.key} label={row.label} text={row.text} score={resolveBarScore(row.score, row.text)} />
            ))}
          </div>

          {/* Text details */}
          <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-3">
            {palateAnalysis.alcohol && (
              <div className="rounded-xl bg-surface-cream p-3">
                <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">{t('aiProfile.palate.alcohol')}</span>
                <p className="mt-0.5 text-sm font-medium text-ink">{palateAnalysis.alcohol}</p>
              </div>
            )}
            {palateAnalysis.texture && (
              <div className="rounded-xl bg-surface-cream p-3">
                <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">{t('aiProfile.palate.texture')}</span>
                <p className="mt-0.5 text-sm font-medium text-ink">{palateAnalysis.texture}</p>
              </div>
            )}
            {palateAnalysis.balance && (
              <div className="rounded-xl bg-surface-cream p-3">
                <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">{t('aiProfile.palate.balance')}</span>
                <p className="mt-0.5 text-sm font-medium text-ink">{palateAnalysis.balance}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ FLAVOR PROFILE ═══════ */}
      {profile.flavorProfile && (
        <div className="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
          <SectionTitle icon={Sparkles} title={t('aiProfile.flavor.title')} />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-48 flex-1 space-y-4">
                <div>
                  <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">{t('aiProfile.flavor.primaryFlavors')}</span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {profile.flavorProfile.primaryFlavors.map((f) => (
                      <span key={f} className="inline-flex items-center rounded-lg bg-wine-50 px-2.5 py-1 text-xs font-medium text-wine-800 ring-1 ring-wine-100">{f}</span>
                    ))}
                  </div>
                </div>
                {profile.flavorProfile.secondaryFlavors && profile.flavorProfile.secondaryFlavors.length > 0 && (
                  <div>
                    <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">{t('aiProfile.flavor.secondaryFlavors')}</span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {profile.flavorProfile.secondaryFlavors.map((f) => (
                        <span key={f} className="inline-flex items-center rounded-lg bg-surface-cream px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-border">{f}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <SectionArt testId="flavor-art" items={art.flavors} />
            </div>
            <div className="space-y-4">
              {profile.flavorProfile.intensity && (
                <div className="rounded-xl bg-surface-cream p-3">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">{t('aiProfile.flavor.intensity')}</span>
                  <p className="mt-0.5 text-sm font-medium text-ink">{profile.flavorProfile.intensity}</p>
                </div>
              )}
              {profile.flavorProfile.finish && (
                <div className="rounded-xl bg-surface-cream p-3">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">{t('aiProfile.flavor.finish')}</span>
                  <p className="mt-0.5 text-sm font-medium text-ink">{profile.flavorProfile.finish}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ FOOD PAIRINGS + SERVING ═══════ */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Food Pairings */}
        {profile.foodPairings && (
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <SectionTitle icon={UtensilsCrossed} title={t('aiProfile.foodPairings')} />
            <div className="mb-4 flex flex-wrap items-start gap-4">
              <div className="flex min-w-48 flex-1 flex-wrap content-start gap-2">
                {profile.foodPairings.pairings?.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1.5 rounded-xl bg-wine-50 px-3 py-1.5 text-xs font-medium text-wine-800 ring-1 ring-wine-100">
                    <Icon icon={Check} size="xs" className="text-wine-700" />
                    {p}
                  </span>
                ))}
              </div>
              <SectionArt testId="pairing-art" items={art.pairings} />
            </div>
            {profile.foodPairings.explanation && (
              <p className="text-sm leading-relaxed text-gray-500">{profile.foodPairings.explanation}</p>
            )}
          </div>
        )}

        {/* Serving Recommendations */}
        {profile.servingRecommendations && (
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <SectionTitle icon={GlassWater} title={t('aiProfile.serving.title')} />
            <div data-testid="serving-art" className="grid grid-cols-2 gap-3">
              {[
                { label: t('aiProfile.serving.temperature'), value: profile.servingRecommendations.temperature, icon: Thermometer,
                  art: art.serving.temperature && <ServingThermometer temperature={art.serving.temperature} /> },
                { label: t('aiProfile.serving.glassware'), value: profile.servingRecommendations.glassware, icon: Wine, art: servingImage(art.serving.glassSrc) },
                { label: t('aiProfile.serving.decanting'), value: profile.servingRecommendations.decanting, icon: Clock, art: servingImage(art.serving.decanterSrc) },
                { label: t('aiProfile.serving.aging'), value: profile.servingRecommendations.agingPotential, icon: CalendarDays, art: servingImage(art.serving.cellarSrc) },
              ].map((item) => (
                <div key={item.label} data-testid="serving-box" className="flex flex-col items-center gap-2 rounded-xl bg-surface-cream p-4 text-center">
                  {item.art ? (
                    <div className="flex h-16 items-end justify-center">{item.art}</div>
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-wine-700 shadow-sm">
                      <Icon icon={item.icon} size="xs" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">{item.label}</span>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-ink">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AiProfileActionBar t={t} id={id} wine={wine} />
    </div>
  )
}

/** The icon well and title that open every profile section. */
function SectionTitle({ icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-wine-50 text-wine-700">
        <Icon icon={icon} />
      </div>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-ink">{title}</h2>
    </div>
  )
}

/** A section's rotating vignettes, beside its text; nothing when no descriptor has art. */
function SectionArt({ testId, items }: { testId: string; items: VignetteItem[] }) {
  if (items.length === 0) return null
  return (
    <div data-testid={testId} className="flex-shrink-0">
      <RotatingVignette items={items} />
    </div>
  )
}

/** A serving illustration (glass, decanter or cellar) on top of its box; decorative, since the text names it. */
function servingImage(src: string | null): ReactNode {
  return src ? <img src={src} alt="" aria-hidden="true" decoding="async" className="profile-art-appear h-14 w-14 object-contain" /> : null
}

/** One palate score: the label and its description stay apart, and a long description wraps under its own column. */
function PalateBar({ label, text, score }: { label: string; text?: string | null; score: number }) {
  return (
    <div data-testid="palate-bar">
      <div className="mb-2 flex items-start justify-between gap-4">
        <span className="shrink-0 text-xs font-semibold text-gray-700">{label}</span>
        <span className="min-w-0 max-w-[65%] text-right text-2xs leading-snug text-gray-500">{text || `${score}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div data-testid="palate-bar-fill" className="profile-bar-fill h-full rounded-full bg-gradient-to-r from-wine-300 to-wine-700 transition-all duration-700" style={{ width: `${sensoryBarWidth(score)}%` }} />
      </div>
    </div>
  )
}
