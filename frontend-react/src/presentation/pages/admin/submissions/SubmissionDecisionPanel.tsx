import { useTranslation } from 'react-i18next'
import type { AdminWineSubmission } from '@domain/admin/admin.types'
import { MAX_SUBMISSION_REASON_LENGTH } from '@domain/admin/moderationReasons'
import { ReasonPicker } from '@components/ui/ReasonPicker'
import { fieldErrorClassName } from '@components/ui/fieldStyles'
import type { AdminWineSubmissionsViewModel } from '../useAdminWineSubmissionsViewModel'
import { SubmissionDecisionCards } from './SubmissionDecisionCards'
import { SubmissionMergeWinePicker } from './SubmissionMergeWinePicker'
import { SubmissionOverrideFields } from './SubmissionOverrideFields'

const REASON_TONES = { APPROVE_NEW: 'wine', MERGE_EXISTING: 'wine', REQUEST_CORRECTIONS: 'warning', REJECT: 'danger' } as const

interface SubmissionDecisionPanelProps {
  vm: AdminWineSubmissionsViewModel
  submission: AdminWineSubmission
}

/** Decision, reason and corrections for one submission; the whole form is locked while it saves. */
export function SubmissionDecisionPanel({ vm, submission }: SubmissionDecisionPanelProps) {
  const { t } = useTranslation()
  const { decision, errors, isDeciding } = vm
  const hasErrors = Object.keys(errors).length > 0
  return (
    <div className="border-t border-gray-100 pt-5">
    <fieldset disabled={isDeciding} className="m-0 min-w-0 space-y-4 border-0 p-0">
      <SubmissionDecisionCards value={decision} onChange={vm.setDecision} />
      {decision === 'APPROVE_NEW' && (
        <SubmissionOverrideFields
          submission={submission}
          overrides={vm.catalogOverrides}
          onChange={vm.setCatalogOverride}
          alcoholError={errors.alcoholContent}
        />
      )}
      {decision === 'MERGE_EXISTING' && (
        <SubmissionMergeWinePicker value={vm.targetWine} onChange={vm.setTargetWine} error={errors.targetWine} disabled={isDeciding} />
      )}
      <div className="space-y-1">
        <ReasonPicker
          legend={t('admin.submissions.reasonLabel')}
          reasons={vm.decisionReasons}
          value={vm.reasonCode}
          onChange={vm.setReasonCode}
          getLabel={(code) => t(`admin.submissions.reasons.${code}`)}
          note={vm.reasonNote}
          onNoteChange={vm.setReasonNote}
          noteLabel={t('admin.submissions.reasonNote')}
          notePlaceholder={t('admin.submissions.reasonPlaceholder')}
          maxNoteLength={MAX_SUBMISSION_REASON_LENGTH}
          help={t('admin.submissions.reasonHelp')}
          disabled={isDeciding}
          tone={REASON_TONES[decision]}
        />
        {errors.reason && <p className={fieldErrorClassName}>{t(errors.reason)}</p>}
      </div>
      {hasErrors && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t('admin.submissions.errors.summary')}</p>
      )}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={vm.closeDetail} className="rounded-lg border border-gray-200 px-4 py-2 text-sm disabled:opacity-50">
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={() => { void vm.submitDecision() }}
          className="rounded-lg bg-wine-700 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isDeciding ? t('common.saving') : t(`admin.submissions.decision.${decision}`)}
        </button>
      </div>
    </fieldset>
    </div>
  )
}
