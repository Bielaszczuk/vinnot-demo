/**
 * Small labels of the social posts queue (#489): status, pillar, wine day, fact check and mock mode.
 */
import { useTranslation } from 'react-i18next'
import { localizedName, type FactCheckResult, type LocalizedName, type SocialPostStatus } from '@domain/admin/socialPost'

const STATUS_STYLES: Record<SocialPostStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  SCHEDULED: 'bg-sky-100 text-sky-800',
  PUBLISHED: 'bg-wine-100 text-wine-800',
  FAILED: 'bg-red-100 text-red-800',
}

const CHIP = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'

export function StatusBadge({ status }: { status: SocialPostStatus }) {
  const { t } = useTranslation()
  return <span className={`${CHIP} ${STATUS_STYLES[status]}`}>{t(`admin.socialPosts.status.${status}`)}</span>
}

export function PillarChip({ pillar }: { pillar: LocalizedName }) {
  const { i18n } = useTranslation()
  return <span className={`${CHIP} bg-wine-50 text-wine-800`}>{localizedName(pillar, i18n.resolvedLanguage ?? i18n.language)}</span>
}

export function WineDayChip({ wineDay }: { wineDay: LocalizedName }) {
  const { i18n } = useTranslation()
  return <span className={`${CHIP} border border-wine-200 bg-white text-wine-700`}>{localizedName(wineDay, i18n.resolvedLanguage ?? i18n.language)}</span>
}

export function MockBadge() {
  const { t } = useTranslation()
  return <span className={`${CHIP} bg-gray-800 text-white`} title={t('admin.socialPosts.generation.mockHelp')}>{t('admin.socialPosts.generation.mock')}</span>
}

/** The fact-check result with its issues when the copy was flagged; nothing while no check ran. */
export function FactCheckBadge({ factCheck, issues }: { factCheck: FactCheckResult | null; issues: string[] }) {
  const { t } = useTranslation()
  if (!factCheck) return null
  const style = factCheck === 'PASSED' ? 'bg-green-100 text-green-800' : factCheck === 'FLAGGED' ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-700'
  return (
    <div className="space-y-2">
      <span className={`${CHIP} ${style}`}>{t(`admin.socialPosts.generation.factCheck.${factCheck}`)}</span>
      {factCheck === 'FLAGGED' && issues.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">{t('admin.socialPosts.generation.issues')}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {issues.map((issue) => <li key={issue}>{issue}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
