/**
 * TasteProfileCard — the illustrated taste profile of a public profile: the taste wheel on its cream
 * stage, then «Estructura» (acidity, body, tannin and sweetness scales, each with its watercolor) and
 * the preferred aroma families as illustrated chips. Under 5 rated wines it shows the locked stage, or,
 * when the taste quiz already seeded traits, those traits beside a compact locked-wheel hint; without traits
 * it shows the wheel alone. A note says when values come from the taste quiz. Every illustration is
 * decorative: the text carries the meaning.
 *
 * On the own profile an editor can be passed: «Ajustar» turns the four structure bars into sliders the member
 * fills or empties to taste, a trait set by hand shows «Ajustado», and «Volver a lo calculado» clears them.
 */
import { useId, type ReactNode } from 'react'
import { ClipboardList, Lock, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { TASTE_TRAITS, type TasteFamily, type TasteTrait, type TasteTraitKey, type TasteTraits, type TasteWheelEntry } from '@domain/social/social.types'
import { tasteLevel } from '@domain/social/tasteTraits'
import { Button } from '@components/ui/Button'
import { Card } from '@components/ui/Card'
import { Icon } from '@components/ui/Icon'
import { TasteTraitSlider } from './TasteTraitSlider'
import { TasteWheel } from './TasteWheel'
import { familyArtUrl, tasteWheelEmblemUrl, traitArtUrl } from './tasteProfileArt'

/** What the card needs to let the member adjust the structure of their own taste profile. */
export interface TasteStructureEditor {
  editing: boolean
  /** The four scores while editing; traits without data start in the middle. */
  values: Record<TasteTraitKey, number>
  start: () => void
  cancel: () => void
  change: (trait: TasteTraitKey, value: number) => void
  save: () => void
  /** Clears every hand-set score. */
  reset: () => void
  busy: boolean
  saving: boolean
  resetting: boolean
  /** Some score is set by hand, so the calculated values can come back. */
  canReset: boolean
  /** The last save or reset did not go through. */
  failed: boolean
}

interface TasteProfileCardProps {
  wheel: TasteWheelEntry[] | null
  traits: TasteTraits | null
  /** The viewer is looking at their own profile: copy speaks to them. */
  isOwn: boolean
  /** Optional call to action in the header, such as the taste quiz entry on the own profile. */
  action?: ReactNode
  /** Own profile only: lets the member adjust the structure bars. Visitors never get one. */
  editor?: TasteStructureEditor | null
}

const SECTION_LABEL = 'text-2xs font-semibold uppercase tracking-[0.14em] text-wine-800/70'
const SECTION_TITLE = `mb-4 ${SECTION_LABEL}`

export function TasteProfileCard({ wheel, traits, isOwn, action, editor = null }: TasteProfileCardProps) {
  const { t } = useTranslation()
  const structure = traits?.structure ?? []
  const families = traits?.families ?? []
  const showStructure = structure.length > 0 || editor !== null
  const hasTraits = showStructure || families.length > 0
  const onlyQuiz = Boolean(traits?.fromQuiz) && !wheel

  return (
    <Card padding="none" className="p-6 sm:p-8">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wine-50 text-wine-700">
          <Icon icon={Sparkles} size="md" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight text-ink">{t('social.tasteProfile.title')}</h2>
          {/* Before 5 rated wines a quiz-seeded profile owes nothing to ratings: the quiz note alone explains it. */}
          {!onlyQuiz && <p className="text-sm text-gray-500">{t(isOwn ? 'social.tasteProfile.subtitleOwn' : 'social.tasteProfile.subtitle')}</p>}
          {traits?.fromQuiz && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-cream px-2.5 py-1 text-xs font-medium text-wine-800 ring-1 ring-wine-100">
              <Icon icon={ClipboardList} size="xs" />
              {t(isOwn ? 'social.tasteProfile.fromQuizOwn' : 'social.tasteProfile.fromQuiz')}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {!wheel && !hasTraits ? (
        <LockedStage text={t(isOwn ? 'social.tasteWheelLockedOwn' : 'social.tasteWheelLocked')} />
      ) : hasTraits ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-10">
          {wheel ? (
            <TasteWheel entries={wheel} layout="stacked" />
          ) : (
            <LockedWheelHint text={t(isOwn ? 'social.tasteProfile.wheelLockedOwn' : 'social.tasteProfile.wheelLocked')} />
          )}
          <div className="space-y-8 lg:pt-2">
            {showStructure && <StructureSection structure={structure} editor={editor} />}
            {families.length > 0 && <AromasSection families={families} isOwn={isOwn} />}
          </div>
        </div>
      ) : wheel && (
        <TasteWheel entries={wheel} />
      )}
    </Card>
  )
}

/** A watercolor in its small cream well; nothing inside when the art is not bundled. */
function ArtWell({ src, className }: { src: string | null; className: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center bg-gradient-to-b from-surface-cream to-white ring-1 ring-wine-100/70 ${className}`}>
      {src && <img src={src} alt="" aria-hidden="true" decoding="async" className="profile-art-appear h-[80%] w-[80%] object-contain" />}
    </span>
  )
}

function StructureSection({ structure, editor }: { structure: TasteTrait[]; editor: TasteStructureEditor | null }) {
  const { t } = useTranslation()
  const titleId = useId()
  const editing = Boolean(editor?.editing)
  const adjusted = new Set(structure.filter((entry) => entry.adjusted).map((entry) => entry.trait))
  return (
    <section
      aria-labelledby={titleId}
      className={editing ? '-mx-3 rounded-3xl bg-gradient-to-b from-surface-cream to-white px-3 py-4 ring-1 ring-wine-100/70 sm:-mx-4 sm:px-4' : undefined}
    >
      <div className="mb-4 flex min-h-6 items-center justify-between gap-3">
        <h3 id={titleId} className={SECTION_LABEL}>{t('social.tasteProfile.structureTitle')}</h3>
        {editor && !editing && (
          <Button variant="ghost" size="sm" onClick={editor.start} leftIcon={<Icon icon={SlidersHorizontal} size="sm" />} className="-my-2 text-wine-800">
            {t('social.tasteProfile.adjust.start')}
          </Button>
        )}
      </div>
      {editor && editing ? (
        <>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">{t('social.tasteProfile.adjust.hint')}</p>
          <ul className="space-y-4">
            {TASTE_TRAITS.map((trait) => (
              <TraitScale
                key={trait}
                trait={trait}
                score={editor.values[trait]}
                adjusted={adjusted.has(trait)}
                onChange={(value) => editor.change(trait, value)}
                disabled={editor.busy}
              />
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={editor.save} isLoading={editor.saving} disabled={editor.busy}>
              {t('social.tasteProfile.adjust.save')}
            </Button>
            <Button variant="ghost" size="sm" onClick={editor.cancel} disabled={editor.busy}>
              {t('social.tasteProfile.adjust.cancel')}
            </Button>
            {editor.canReset && (
              <Button
                variant="ghost"
                size="sm"
                onClick={editor.reset}
                isLoading={editor.resetting}
                disabled={editor.busy}
                leftIcon={<Icon icon={RotateCcw} size="sm" />}
                className="text-wine-800 sm:ml-auto"
              >
                {t('social.tasteProfile.adjust.reset')}
              </Button>
            )}
          </div>
          {editor.failed && <p role="alert" className="mt-3 text-sm text-danger">{t('social.tasteProfile.adjust.error')}</p>}
        </>
      ) : structure.length > 0 ? (
        <ul className="space-y-4">
          {structure.map((entry) => (
            <TraitScale key={entry.trait} trait={entry.trait} score={entry.score} adjusted={entry.adjusted} />
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed text-gray-600">{t('social.tasteProfile.adjust.empty')}</p>
      )}
    </section>
  )
}

interface TraitScaleProps {
  trait: TasteTraitKey
  score: number
  adjusted: boolean
  /** Editing: the scale becomes a slider. */
  onChange?: (value: number) => void
  disabled?: boolean
}

/**
 * One trait: its watercolor, the name (with «Ajustado» when set by hand) and level word, and a low-to-high
 * scale with a marker at the score; a slider while the member adjusts it.
 */
function TraitScale({ trait, score, adjusted, onChange, disabled }: TraitScaleProps) {
  const { t } = useTranslation()
  const name = t(`social.tasteProfile.traits.${trait}`)
  const level = t(`social.tasteProfile.levels.${trait}.${tasteLevel(score)}`)
  const position = `${score}%`
  return (
    <li className="flex items-center gap-4">
      <ArtWell src={traitArtUrl(trait)} className="h-14 w-14 rounded-2xl" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-ink">{name}</span>
            {adjusted && (
              <span className="rounded-full bg-wine-50 px-2 py-0.5 text-[11px] font-medium leading-none text-wine-700 ring-1 ring-inset ring-wine-100">
                {t('social.tasteProfile.adjust.adjusted')}
              </span>
            )}
          </span>
          <span className="shrink-0 text-sm font-medium text-wine-800">{level}</span>
        </div>
        {onChange ? (
          <TasteTraitSlider label={name} value={score} valueText={level} onChange={onChange} disabled={disabled} />
        ) : (
          <div
            role="meter"
            aria-label={name}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(score)}
            aria-valuetext={level}
            className="relative mt-2.5 h-2 rounded-full bg-wine-50 ring-1 ring-inset ring-wine-100/80"
          >
            <span aria-hidden="true" className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-wine-100 to-wine-300/80" style={{ width: position }} />
            <span aria-hidden="true" className="absolute inset-y-0 left-1/3 w-0.5 -translate-x-1/2 bg-white" />
            <span aria-hidden="true" className="absolute inset-y-0 left-2/3 w-0.5 -translate-x-1/2 bg-white" />
            <span
              aria-hidden="true"
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-wine-700 shadow-sm shadow-wine-950/25"
              style={{ left: position }}
            />
          </div>
        )}
      </div>
    </li>
  )
}

function AromasSection({ families, isOwn }: { families: TasteFamily[]; isOwn: boolean }) {
  const { t } = useTranslation()
  const titleId = useId()
  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className={SECTION_TITLE}>{t(isOwn ? 'social.tasteProfile.aromasTitleOwn' : 'social.tasteProfile.aromasTitle')}</h3>
      <ul aria-labelledby={titleId} className="flex flex-wrap gap-2.5">
        {families.map((entry) => (
          <li
            key={entry.family}
            className="flex items-center gap-2.5 rounded-full bg-white py-1 pl-1 pr-4 shadow-sm shadow-wine-950/5 ring-1 ring-wine-100"
          >
            <ArtWell src={familyArtUrl(entry.family)} className="h-10 w-10 rounded-full" />
            <span className="text-sm font-medium text-ink">{t(`social.tasteProfile.families.${entry.family}`)}</span>
            <span className="text-xs font-semibold tabular-nums text-wine-700">{t('social.tasteProfile.percent', { percent: entry.percent })}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Under 5 rated wines: the emblem waits, faded, on the same cream stage. */
function LockedStage({ text }: { text: string }) {
  const emblem = tasteWheelEmblemUrl('GRAPE')
  return (
    <div className="flex flex-col items-center gap-5 rounded-3xl bg-gradient-to-b from-surface-cream to-white px-6 py-8 text-center ring-1 ring-wine-100/70 sm:flex-row sm:px-8 sm:text-left">
      <span className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-dashed border-wine-200 bg-white/80">
        {emblem && <img src={emblem} alt="" aria-hidden="true" decoding="async" className="h-14 w-14 object-contain opacity-45 grayscale-[35%]" />}
        <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-wine-700 shadow-sm ring-1 ring-wine-100">
          <Icon icon={Lock} size="sm" />
        </span>
      </span>
      <p className="max-w-md text-sm leading-relaxed text-gray-600">{text}</p>
    </div>
  )
}

/** Traits are known (the taste quiz) but the wheel needs 5 rated wines: the emblem waits in its column, compact. */
function LockedWheelHint({ text }: { text: string }) {
  const emblem = tasteWheelEmblemUrl('GRAPE')
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-gradient-to-b from-surface-cream to-white p-5 ring-1 ring-wine-100/70 lg:flex-col lg:px-6 lg:py-10 lg:text-center">
      <span className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-dashed border-wine-200 bg-white/80 lg:h-36 lg:w-36">
        {emblem && <img src={emblem} alt="" aria-hidden="true" decoding="async" className="h-12 w-12 object-contain opacity-45 grayscale-[35%] lg:h-20 lg:w-20" />}
        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-wine-700 shadow-sm ring-1 ring-wine-100 lg:bottom-1 lg:right-1">
          <Icon icon={Lock} size="xs" />
        </span>
      </span>
      <p className="text-sm leading-relaxed text-gray-600 lg:max-w-[16rem]">{text}</p>
    </div>
  )
}
