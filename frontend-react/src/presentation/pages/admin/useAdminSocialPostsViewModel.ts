/**
 * View model of the social posts approval queue (#489): status filter, selected post, the four review actions,
 * the inline copy editor, the manual planner run and the wine days of the current and next month; plus the new
 * illustration request for the rendered slides (#492); and the content language (#497) that drives the slides, the
 * copy shown, the downloads and the editor.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  allowedActions,
  canRequestIllustration,
  contentLanguageFor,
  copyDraftErrors,
  draftFromCopy,
  emptyCopyDraft,
  wineDayYears,
  wineDaysOfCurrentAndNextMonth,
  type PlanResult,
  type SocialLanguage,
  type SocialPost,
  type SocialPostCopyDraft,
  type SocialPostSlide,
  type SocialPostStatus,
} from '@domain/admin/socialPost'
import { isSocialPostConflict } from '@services/adminSocialPosts.service'
import { useToast } from '@hooks/useToast'
import {
  useAdminSocialPost,
  useAdminSocialPosts,
  useAdminWineDays,
  useApproveSocialPost,
  useNewSocialPostIllustration,
  usePlanSocialPosts,
  useRegenerateSocialPost,
  useRejectSocialPost,
  useUpdateSocialPostCopy,
} from '@hooks/queries/admin/useAdminSocialPosts'

const PAGE_SIZE = 20
/** The AI writes a planned batch in the background (#489): refresh the queue meanwhile, for a few minutes at most. */
const COPY_REFRESH_MS = 10_000
const COPY_WAIT_MS = 5 * 60_000
type DraftTextField = Exclude<keyof SocialPostCopyDraft, 'slides'>

export function useAdminSocialPostsViewModel(today: Date = new Date()) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  const { addToast } = useToast()
  const [status, setStatusState] = useState<SocialPostStatus>('PENDING_APPROVAL')
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<string>()
  // Starts on the UI language and stays when another post is selected, so a whole account can be reviewed in one go.
  const [contentLanguage, setContentLanguage] = useState<SocialLanguage>(() => contentLanguageFor(language))
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<SocialPostCopyDraft>(emptyCopyDraft)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [lastPlan, setLastPlan] = useState<PlanResult | null>(null)
  const [awaitingCopy, setAwaitingCopy] = useState(false)

  useEffect(() => {
    if (!awaitingCopy) return undefined
    const timer = setTimeout(() => setAwaitingCopy(false), COPY_WAIT_MS)
    return () => clearTimeout(timer)
  }, [awaitingCopy, lastPlan])

  const years = wineDayYears(today)
  const crossesYear = years.length > 1
  const listQuery = useAdminSocialPosts(page, PAGE_SIZE, status, awaitingCopy ? COPY_REFRESH_MS : false)
  const detailQuery = useAdminSocialPost(selectedId)
  const thisYearDays = useAdminWineDays(years[0]!)
  // Shares the key of the first query when the window stays in one year, so its data is only merged when asked for.
  const nextYearDays = useAdminWineDays(years[1] ?? years[0]!, crossesYear)
  const approveMutation = useApproveSocialPost()
  const rejectMutation = useRejectSocialPost()
  const updateMutation = useUpdateSocialPostCopy()
  const regenerateMutation = useRegenerateSocialPost()
  const illustrationMutation = useNewSocialPostIllustration()
  const planMutation = usePlanSocialPosts()

  const post: SocialPost | undefined = detailQuery.data
  const copy = post?.copies[contentLanguage] ?? null
  const actions = useMemo(() => (post ? allowedActions(post, contentLanguage) : []), [contentLanguage, post])
  const draftErrors = useMemo(() => copyDraftErrors(draft, contentLanguage), [contentLanguage, draft])
  const wineDays = useMemo(
    () => wineDaysOfCurrentAndNextMonth(
      [...(thisYearDays.data ?? []), ...(crossesYear ? nextYearDays.data ?? [] : [])],
      today,
    ),
    [crossesYear, nextYearDays.data, thisYearDays.data, today],
  )

  const formatDate = useCallback(
    (iso: string) => new Date(iso).toLocaleString(language, { dateStyle: 'medium', timeStyle: 'short' }),
    [language],
  )
  const formatDay = useCallback(
    (isoDate: string) => new Date(`${isoDate}T00:00:00`).toLocaleDateString(language, { weekday: 'short', day: 'numeric', month: 'short' }),
    [language],
  )

  const selectPost = useCallback((id: string) => {
    setSelectedId(id)
    setEditing(false)
    setRejecting(false)
    setReason('')
  }, [])

  const setStatus = useCallback((value: SocialPostStatus) => {
    setStatusState(value)
    setPage(0)
  }, [])

  const run = useCallback(async (action: () => Promise<unknown>, successKey: string) => {
    try {
      await action()
      addToast({ type: 'success', message: t(successKey) })
      return true
    } catch (error) {
      addToast({ type: 'error', message: t(isSocialPostConflict(error) ? 'admin.socialPosts.actions.conflict' : 'admin.socialPosts.actions.error') })
      return false
    }
  }, [addToast, t])

  const approve = useCallback(async () => {
    if (!selectedId) return
    await run(() => approveMutation.mutateAsync(selectedId), 'admin.socialPosts.actions.approved')
  }, [approveMutation, run, selectedId])

  const confirmReject = useCallback(async () => {
    if (!selectedId) return
    const done = await run(() => rejectMutation.mutateAsync({ id: selectedId, reason }), 'admin.socialPosts.actions.rejected')
    if (done) {
      setRejecting(false)
      setReason('')
    }
  }, [reason, rejectMutation, run, selectedId])

  const regenerate = useCallback(async () => {
    if (!selectedId) return
    await run(() => regenerateMutation.mutateAsync(selectedId), 'admin.socialPosts.actions.regenerated')
  }, [regenerateMutation, run, selectedId])

  const newIllustration = useCallback(async () => {
    if (!selectedId) return
    await run(() => illustrationMutation.mutateAsync(selectedId), 'admin.socialPosts.media.requested')
  }, [illustrationMutation, run, selectedId])

  const startEdit = useCallback(() => {
    setDraft(copy ? draftFromCopy(copy) : emptyCopyDraft())
    setRejecting(false)
    setEditing(true)
  }, [copy])

  const saveEdit = useCallback(async () => {
    if (!selectedId || draftErrors.length > 0) return
    const done = await run(
      () => updateMutation.mutateAsync({ id: selectedId, language: contentLanguage, draft }),
      'admin.socialPosts.actions.saved',
    )
    if (done) setEditing(false)
  }, [contentLanguage, draft, draftErrors.length, run, selectedId, updateMutation])

  const planNow = useCallback(async () => {
    try {
      const result = await planMutation.mutateAsync()
      setLastPlan(result)
      setAwaitingCopy(result.created > 0)
      addToast({ type: 'success', message: t('admin.socialPosts.planned', { count: result.created, from: result.from, to: result.to }) })
    } catch {
      addToast({ type: 'error', message: t('admin.socialPosts.planError') })
    }
  }, [addToast, planMutation, t])

  const updateDraft = useCallback((field: DraftTextField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }, [])

  const updateSlide = useCallback((index: number, field: keyof SocialPostSlide, value: string) => {
    setDraft((current) => ({
      ...current,
      slides: current.slides.map((slide, position) => (position === index ? { ...slide, [field]: value } : slide)),
    }))
  }, [])

  const addSlide = useCallback(() => {
    setDraft((current) => ({ ...current, slides: [...current.slides, { title: '', body: '' }] }))
  }, [])

  const removeSlide = useCallback((index: number) => {
    setDraft((current) => ({ ...current, slides: current.slides.filter((_, position) => position !== index) }))
  }, [])

  const working = approveMutation.isPending || rejectMutation.isPending || updateMutation.isPending
    || regenerateMutation.isPending || illustrationMutation.isPending

  return {
    t,
    language,
    formatDate,
    formatDay,
    status,
    setStatus,
    page,
    setPage,
    posts: listQuery.data?.items ?? [],
    totalItems: listQuery.data?.totalItems ?? 0,
    totalPages: Math.ceil((listQuery.data?.totalItems ?? 0) / PAGE_SIZE),
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    refetch: listQuery.refetch,
    selectedId,
    selectPost,
    post,
    contentLanguage,
    setContentLanguage,
    copy,
    isDetailLoading: detailQuery.isLoading,
    isDetailError: detailQuery.isError,
    refetchDetail: detailQuery.refetch,
    actions,
    working,
    approve,
    rejecting,
    reason,
    setReason,
    startReject: () => { setEditing(false); setRejecting(true) },
    cancelReject: () => { setRejecting(false); setReason('') },
    confirmReject,
    regenerate,
    canRequestIllustration: post ? canRequestIllustration(post) : false,
    newIllustration,
    editing,
    draft,
    draftErrors,
    startEdit,
    cancelEdit: () => setEditing(false),
    saveEdit,
    updateDraft,
    updateSlide,
    addSlide,
    removeSlide,
    planNow,
    isPlanning: planMutation.isPending,
    lastPlan,
    awaitingCopy,
    wineDays,
    wineDaysLoading: thisYearDays.isLoading || nextYearDays.isLoading,
    wineDaysError: thisYearDays.isError || nextYearDays.isError,
    refetchWineDays: () => { void thisYearDays.refetch(); void nextYearDays.refetch() },
  }
}
