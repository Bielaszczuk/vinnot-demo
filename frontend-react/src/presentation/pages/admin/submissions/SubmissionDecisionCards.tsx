import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { AdminWineSubmissionDecision } from '@domain/admin/admin.types'
import { fieldLabelClassName } from '@components/ui/fieldStyles'

const SUBMISSION_DECISIONS: readonly AdminWineSubmissionDecision[] = [
  'APPROVE_NEW', 'MERGE_EXISTING', 'REQUEST_CORRECTIONS', 'REJECT',
]

interface SubmissionDecisionCardsProps {
  value: AdminWineSubmissionDecision
  onChange: (decision: AdminWineSubmissionDecision) => void
}

/** The four decisions as labelled radio cards, each saying what it does. */
export function SubmissionDecisionCards({ value, onChange }: SubmissionDecisionCardsProps) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div role="radiogroup" aria-labelledby={`${id}-label`} className="space-y-2">
      <p id={`${id}-label`} className={fieldLabelClassName}>{t('admin.submissions.decisionLabel')}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {SUBMISSION_DECISIONS.map((decision) => (
          <label
            key={decision}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-colors hover:border-wine-300 has-checked:border-wine-600 has-checked:bg-wine-50 has-focus-visible:ring-2 has-focus-visible:ring-wine-500/40 has-disabled:cursor-not-allowed has-disabled:opacity-60"
          >
            <input
              type="radio"
              name={`${id}-decision`}
              value={decision}
              checked={value === decision}
              onChange={() => onChange(decision)}
              aria-labelledby={`${id}-${decision}`}
              aria-describedby={`${id}-${decision}-help`}
              className="mt-0.5 h-4 w-4 shrink-0 accent-wine-700 focus:outline-none"
            />
            <span className="min-w-0">
              <span id={`${id}-${decision}`} className="block text-sm font-medium text-gray-900">
                {t(`admin.submissions.decision.${decision}`)}
              </span>
              <span id={`${id}-${decision}-help`} className="block text-xs text-gray-500">
                {t(`admin.submissions.decisionHelp.${decision}`)}
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
