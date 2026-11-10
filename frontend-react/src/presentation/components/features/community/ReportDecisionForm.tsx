import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/ui/Button'
import { ReasonPicker } from '@components/ui/ReasonPicker'
import { fieldLabelClassName } from '@components/ui/fieldStyles'
import { useConfirm } from '@hooks/useConfirm'
import type { ReportTargetType } from '@domain/community/community.types'
import {
  MAX_REPORT_DECISION_LENGTH,
  REPORT_DECISION_REASONS,
  reportOutcomes,
  type ReportDecisionReason,
  type ReportOutcome,
} from '@domain/community/reportDecision'
import { presetReasonText } from '@domain/admin/moderationReasons'

const OUTCOME_LABELS: Record<ReportOutcome, string> = {
  RESOLVED: 'community.resolve',
  DISMISSED: 'community.dismiss',
  REMOVE_CONTENT: 'community.removeContent',
}
const OUTCOME_TONES = { RESOLVED: 'wine', DISMISSED: 'wine', REMOVE_CONTENT: 'danger' } as const

interface ReportDecisionFormProps {
  reportId: string
  targetType: ReportTargetType
  disabled: boolean
  onDecide: (input: { id: string; status: 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED'; decision: string }) => void
  onRemove: (input: { id: string; decision: string }) => void
}

/**
 * How a moderator closes a report: pick the outcome, then a one-tap reason
 * for it (free text only under "Other"). Claiming the case stays one tap.
 */
export function ReportDecisionForm({ reportId, targetType, disabled, onDecide, onRemove }: ReportDecisionFormProps) {
  const { t } = useTranslation()
  const { confirm } = useConfirm()
  const id = useId()
  const [outcome, setOutcome] = useState<ReportOutcome>('RESOLVED')
  const [reason, setReason] = useState<ReportDecisionReason>(REPORT_DECISION_REASONS.RESOLVED[0])
  const [note, setNote] = useState('')
  const decision = presetReasonText(
    reason, t(`community.decisionReasons.${outcome}.${reason}`), note, MAX_REPORT_DECISION_LENGTH,
  )

  const chooseOutcome = (next: ReportOutcome) => {
    setOutcome(next)
    setReason(REPORT_DECISION_REASONS[next][0])
    setNote('')
  }

  const apply = async () => {
    if (outcome !== 'REMOVE_CONTENT') {
      onDecide({ id: reportId, status: outcome, decision })
      return
    }
    const confirmed = await confirm({
      title: t('community.removeContent'),
      message: t('community.removeConfirm'),
      confirmLabel: t('community.removeContent'),
      cancelLabel: t('community.cancel'),
      variant: 'danger',
    })
    if (confirmed) onRemove({ id: reportId, decision })
  }

  return (
    <fieldset disabled={disabled} className="m-0 min-w-0 space-y-3 border-0 p-0">
      <div role="radiogroup" aria-labelledby={`${id}-outcome`} className="space-y-2">
        <p id={`${id}-outcome`} className={fieldLabelClassName}>{t('community.outcomeLabel')}</p>
        <div className="flex flex-wrap gap-2">
          {reportOutcomes(targetType).map((value) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name={`${id}-outcome-choice`}
                value={value}
                checked={outcome === value}
                onChange={() => chooseOutcome(value)}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-9 items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-wine-400 peer-checked:border-wine-700 peer-checked:bg-wine-50 peer-checked:text-wine-800 peer-focus-visible:ring-2 peer-focus-visible:ring-wine-500/40 peer-disabled:cursor-not-allowed peer-disabled:opacity-60">
                {t(OUTCOME_LABELS[value])}
              </span>
            </label>
          ))}
        </div>
      </div>
      <ReasonPicker
        legend={t('community.decisionReasonLabel')}
        reasons={REPORT_DECISION_REASONS[outcome] as readonly ReportDecisionReason[]}
        value={reason}
        onChange={setReason}
        getLabel={(code) => t(`community.decisionReasons.${outcome}.${code}`)}
        note={note}
        onNoteChange={setNote}
        noteLabel={t('community.decisionNote')}
        notePlaceholder={t('community.decisionPlaceholder')}
        maxNoteLength={MAX_REPORT_DECISION_LENGTH}
        help={t('community.decisionReasonHelp')}
        disabled={disabled}
        tone={OUTCOME_TONES[outcome]}
      />
      <div className="flex flex-wrap gap-3">
        <Button
          variant={outcome === 'REMOVE_CONTENT' ? 'danger' : 'primary'}
          disabled={disabled || !decision}
          onClick={() => { void apply() }}
        >
          {t(OUTCOME_LABELS[outcome])}
        </Button>
        <Button variant="outline" disabled={disabled} onClick={() => onDecide({ id: reportId, status: 'IN_REVIEW', decision: '' })}>
          {t('community.claim')}
        </Button>
      </div>
    </fieldset>
  )
}
