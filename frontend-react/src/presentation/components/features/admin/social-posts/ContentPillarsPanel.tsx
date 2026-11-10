/**
 * The content pillars the planner rotates (#510): weight, performance over the weighting window and the two switches,
 * planned (active) and approved by the system (auto-approve). Auto-approval only changes while the pillar is active.
 */
import { useTranslation } from 'react-i18next'
import { Spinner } from '@components/ui/Spinner'
import { AdminQueryError } from '@components/features/admin/AdminQueryError'
import {
  canToggleAutoApprove,
  localizedName,
  performanceFactorLabel,
  type ContentPillarSettings,
} from '@domain/admin/socialPost'

interface ContentPillarsPanelProps {
  pillars: ContentPillarSettings[]
  loading: boolean
  failed: boolean
  /** Code of the pillar whose switch is saving; every switch waits for it. */
  switching: string | null
  formatNumber: (value: number) => string
  onRetry: () => unknown
  onToggleActive: (pillar: ContentPillarSettings) => unknown
  onToggleAutoApprove: (pillar: ContentPillarSettings) => unknown
}

/** Same look and footprint as the push type switches of the notifications admin. */
function Switch({ checked, label, disabled, onToggle }: { checked: boolean; label: string; disabled: boolean; onToggle: () => unknown }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => void onToggle()}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-wine-500/40 disabled:opacity-60 ${checked ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

export function ContentPillarsPanel({
  pillars, loading, failed, switching, formatNumber, onRetry, onToggleActive, onToggleAutoApprove,
}: ContentPillarsPanelProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  if (loading) return <div className="p-8 text-center"><Spinner /></div>
  if (failed) return <AdminQueryError retry={onRetry} />
  if (pillars.length === 0) return <p className="p-6 text-center text-sm text-gray-500">{t('admin.socialPosts.pillars.empty')}</p>
  return (
    <ul aria-label={t('admin.socialPosts.pillars.heading')} className="divide-y divide-gray-100">
      {pillars.map((pillar) => {
        const name = localizedName(pillar, language)
        const { performance } = pillar
        return (
          <li key={pillar.code} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium text-gray-900">{name}</p>
              <p className="flex flex-wrap gap-x-3 text-xs text-gray-500">
                <span>{t('admin.socialPosts.pillars.weight', { weight: pillar.weight })}</span>
                <span title={t('admin.socialPosts.pillars.factorHelp')}>
                  {t('admin.socialPosts.pillars.factor', { factor: performanceFactorLabel(performance.factor) })}
                </span>
              </p>
              <p className="text-xs text-gray-500">
                {t('admin.socialPosts.pillars.performance', {
                  measured: performance.measuredPosts,
                  views: formatNumber(performance.views),
                  interactions: formatNumber(performance.interactions),
                })}
              </p>
              {!canToggleAutoApprove(pillar) && <p className="text-xs text-amber-800">{t('admin.socialPosts.pillars.autoApproveInactive')}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-4">
              {switching === pillar.code && <Spinner size="sm" />}
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-gray-600" aria-hidden="true">{t('admin.socialPosts.pillars.active')}</span>
                <Switch
                  checked={pillar.active}
                  label={t('admin.socialPosts.pillars.activeLabel', { pillar: name })}
                  disabled={switching !== null}
                  onToggle={() => onToggleActive(pillar)}
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-gray-600" aria-hidden="true">{t('admin.socialPosts.pillars.autoApprove')}</span>
                <Switch
                  checked={pillar.autoApprove}
                  label={t('admin.socialPosts.pillars.autoApproveLabel', { pillar: name })}
                  disabled={switching !== null || !canToggleAutoApprove(pillar)}
                  onToggle={() => onToggleAutoApprove(pillar)}
                />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
