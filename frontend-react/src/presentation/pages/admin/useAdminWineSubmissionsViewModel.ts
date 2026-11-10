import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  AdminWine,
  AdminWineSubmissionDecision,
  AdminWineSubmissionStatus,
} from '@domain/admin/admin.types'
import { submissionCatalogValues } from '@domain/admin/adminSubmissionCatalog'
import {
  MAX_SUBMISSION_REASON_LENGTH,
  SUBMISSION_DECISION_REASONS,
  presetReasonText,
  type SubmissionDecisionReason,
} from '@domain/admin/moderationReasons'
import { useAdminSubmissionImage } from '@hooks/queries/admin/useAdminSubmissionImage'
import { useToast } from '@hooks/useToast'
import {
  useAdminWineSubmission,
  useAdminWineSubmissions,
} from '@hooks/queries/admin/useAdminWineSubmissions'
import { useDecideAdminWineSubmission } from '@hooks/queries/admin/useAdminWineSubmissionMutations'
import {
  EMPTY_SUBMISSION_OVERRIDES,
  submissionDecisionErrorKey,
  toSubmissionDecisionInput,
  validateSubmissionDecision,
  type SubmissionCatalogOverrides,
  type SubmissionDecisionErrors,
  type SubmissionOverrideField,
} from './submissions/submissionDecisionForm'

const PAGE_SIZE = 20
const DEFAULT_DECISION: AdminWineSubmissionDecision = 'APPROVE_NEW'
const firstReason = (decision: AdminWineSubmissionDecision): SubmissionDecisionReason =>
  SUBMISSION_DECISION_REASONS[decision][0]

export function useAdminWineSubmissionsViewModel() {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState<AdminWineSubmissionStatus>('NEEDS_REVIEW')
  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string>()
  const [decision, setDecisionState] = useState<AdminWineSubmissionDecision>(DEFAULT_DECISION)
  const [reasonCode, setReasonCodeState] = useState<SubmissionDecisionReason>(firstReason(DEFAULT_DECISION))
  const [reasonNote, setReasonNoteState] = useState('')
  const [targetWine, setTargetWineState] = useState<AdminWine | null>(null)
  const [catalogOverrides, setCatalogOverrides] = useState<SubmissionCatalogOverrides>(EMPTY_SUBMISSION_OVERRIDES)
  const [errors, setErrors] = useState<SubmissionDecisionErrors>({})
  const submitting = useRef(false)
  const listQuery = useAdminWineSubmissions(page, PAGE_SIZE, status, activeSearch || undefined)
  const detailQuery = useAdminWineSubmission(selectedId)
  const decisionMutation = useDecideAdminWineSubmission()
  const image = useAdminSubmissionImage(selectedId, !!detailQuery.data?.imageAvailable)

  const clearError = (field: keyof SubmissionDecisionErrors) =>
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })

  const setDecision = useCallback((value: AdminWineSubmissionDecision) => {
    setDecisionState(value)
    setReasonCodeState(firstReason(value))
    setReasonNoteState('')
    setErrors({})
  }, [])

  const selectSubmission = useCallback((id: string) => {
    setSelectedId(id)
    setDecision(DEFAULT_DECISION)
    setTargetWineState(null)
    setCatalogOverrides(EMPTY_SUBMISSION_OVERRIDES)
  }, [setDecision])

  const applySearch = useCallback(() => {
    setPage(0)
    setActiveSearch(search.trim())
  }, [search])

  const submitDecision = useCallback(async () => {
    if (!selectedId || submitting.current) return
    const reason = presetReasonText(
      reasonCode, t(`admin.submissions.reasons.${reasonCode}`), reasonNote, MAX_SUBMISSION_REASON_LENGTH,
    )
    const draft = { decision, reason, targetWineId: targetWine?.id ?? null, overrides: catalogOverrides }
    const found = validateSubmissionDecision(draft)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    submitting.current = true
    try {
      await decisionMutation.mutateAsync({ id: selectedId, input: toSubmissionDecisionInput(draft) })
      addToast({ type: 'success', message: t('admin.submissions.decisionSaved') })
      setSelectedId(undefined)
    } catch (error) {
      addToast({ type: 'error', message: t(submissionDecisionErrorKey(error)) })
    } finally {
      submitting.current = false
    }
  }, [addToast, catalogOverrides, decision, decisionMutation, reasonCode, reasonNote, selectedId, t, targetWine])

  return {
    t,
    page,
    setPage,
    status,
    setStatus: (value: AdminWineSubmissionStatus) => { setStatus(value); setPage(0) },
    search,
    setSearch,
    applySearch,
    submissions: listQuery.data?.items ?? [],
    totalItems: listQuery.data?.totalItems ?? 0,
    totalPages: Math.ceil((listQuery.data?.totalItems ?? 0) / PAGE_SIZE),
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    refetch: listQuery.refetch,
    selectedId,
    selectSubmission,
    closeDetail: () => setSelectedId(undefined),
    submission: detailQuery.data,
    catalogValues: detailQuery.data ? submissionCatalogValues(detailQuery.data) : [],
    isDetailLoading: detailQuery.isLoading,
    isDetailError: detailQuery.isError,
    refetchDetail: detailQuery.refetch,
    image,
    decision,
    setDecision,
    decisionReasons: SUBMISSION_DECISION_REASONS[decision] as readonly SubmissionDecisionReason[],
    reasonCode,
    setReasonCode: (value: SubmissionDecisionReason) => { setReasonCodeState(value); clearError('reason') },
    reasonNote,
    setReasonNote: (value: string) => { setReasonNoteState(value); clearError('reason') },
    targetWine,
    setTargetWine: (wine: AdminWine | null) => { setTargetWineState(wine); clearError('targetWine') },
    catalogOverrides,
    setCatalogOverride: <F extends SubmissionOverrideField>(field: F, value: SubmissionCatalogOverrides[F]) => {
      setCatalogOverrides((current) => ({ ...current, [field]: value }))
      if (field === 'alcoholContent') clearError('alcoholContent')
    },
    errors,
    submitDecision,
    isDeciding: decisionMutation.isPending,
  }
}

export type AdminWineSubmissionsViewModel = ReturnType<typeof useAdminWineSubmissionsViewModel>
