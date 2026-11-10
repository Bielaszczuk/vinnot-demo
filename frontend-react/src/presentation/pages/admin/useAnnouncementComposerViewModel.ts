import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@hooks/useToast'
import { useDebounce } from '@hooks/useDebounce'
import {
  useAdminCountries,
  useAdminRegions,
  useAnnouncementPreview,
  useAnnouncementReach,
  useSendAnnouncement,
  useTestAnnouncement,
} from '@hooks/queries/admin'
import {
  draftErrors,
  emptyAnnouncementDraft,
  versionErrors,
  writtenLanguages,
  type AnnouncementAudience,
  type AnnouncementDestination,
  type AnnouncementDraft,
  type AnnouncementKind,
  type AnnouncementLanguage,
  type AnnouncementVersion,
} from '@domain/admin/announcement'
import { applyAnnouncementFormat, type AnnouncementFormat } from '@domain/admin/announcementFormat'
import { announcementErrorCode } from '@services/adminNotifications.service'

const PREVIEW_DELAY_MS = 500
const REACH_DELAY_MS = 300

/** Composer of the admin notifications section (#310): draft, live preview, audience reach, test and send. */
export function useAnnouncementComposerViewModel() {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const [draft, setDraft] = useState<AnnouncementDraft>(emptyAnnouncementDraft)
  const [language, setLanguage] = useState<AnnouncementLanguage>('es')
  const [confirming, setConfirming] = useState(false)
  // One id per draft being sent, kept across retries of that same draft so a repeated request never sends twice.
  const sendRequest = useRef<{ draft: AnnouncementDraft; id: string } | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const countries = useAdminCountries()
  const countryId = draft.audience.countryId
  const regions = useAdminRegions(countryId)
  const testMutation = useTestAnnouncement()
  const sendMutation = useSendAnnouncement()

  const version = draft.versions[language]
  const editing = useMemo(() => ({ language, version }), [language, version])
  // Language and text are debounced together so a preview never renders one language's text as the other.
  const debounced = useDebounce(editing, PREVIEW_DELAY_MS)
  const previewable = versionErrors(debounced.version).length === 0
  const preview = useAnnouncementPreview(draft.kind, debounced.language, previewable ? debounced.version : null)
  const debouncedAudience = useDebounce(draft.audience, REACH_DELAY_MS)
  const reach = useAnnouncementReach(draft.kind, debouncedAudience)

  /** The count shown matches the current audience: not waiting for the debounce or a refetch. */
  const reachSettled = debouncedAudience === draft.audience && !reach.isFetching
  const errors = useMemo(() => draftErrors(draft), [draft])
  const languages = writtenLanguages(draft)
  const working = testMutation.isPending || sendMutation.isPending

  const setKind = useCallback((kind: AnnouncementKind) => setDraft((current) => ({ ...current, kind })), [])
  const setDestination = useCallback((destination: AnnouncementDestination) =>
    setDraft((current) => ({ ...current, destination })), [])
  const updateVersion = useCallback((patch: Partial<AnnouncementVersion>) => {
    setDraft((current) => ({
      ...current,
      versions: { ...current.versions, [language]: { ...current.versions[language], ...patch } },
    }))
  }, [language])
  const updateAudience = useCallback((patch: Partial<AnnouncementAudience>) => {
    setDraft((current) => ({ ...current, audience: { ...current.audience, ...patch } }))
  }, [])
  const selectCountry = useCallback((id: string | null) => {
    updateAudience({ countryId: id, regionId: null })
  }, [updateAudience])

  const applyFormat = useCallback((format: AnnouncementFormat) => {
    const field = bodyRef.current
    const start = field?.selectionStart ?? version.body.length
    const end = field?.selectionEnd ?? version.body.length
    const edit = applyAnnouncementFormat(version.body, start, end, format, t(`admin.notifications.composer.formatFallback.${format}`))
    updateVersion({ body: edit.text })
    requestAnimationFrame(() => {
      field?.focus()
      field?.setSelectionRange(edit.selectionStart, edit.selectionEnd)
    })
  }, [t, updateVersion, version.body])

  const failure = useCallback((error: unknown) => {
    const code = announcementErrorCode(error)
    addToast({ type: 'error', message: t(code ? `admin.notifications.errors.${code}` : 'admin.notifications.errors.generic') })
  }, [addToast, t])

  const sendTest = useCallback(async () => {
    try {
      const reached = await testMutation.mutateAsync(draft)
      addToast({
        type: 'success',
        message: t(reached.push > 0 ? 'admin.notifications.composer.testSentBoth' : 'admin.notifications.composer.testSentEmail'),
      })
    } catch (error) {
      failure(error)
    }
  }, [addToast, draft, failure, t, testMutation])

  const send = useCallback(async () => {
    try {
      if (sendRequest.current?.draft !== draft) sendRequest.current = { draft, id: crypto.randomUUID() }
      const sent = await sendMutation.mutateAsync({ draft, requestId: sendRequest.current.id })
      addToast({
        type: 'success',
        message: t('admin.notifications.composer.sent', { count: sent?.recipients ?? reach.data?.accounts ?? 0 }),
      })
      setConfirming(false)
      setDraft(emptyAnnouncementDraft())
      setLanguage('es')
      sendRequest.current = null
    } catch (error) {
      failure(error)
    }
  }, [addToast, draft, failure, reach.data?.accounts, sendMutation, t])

  return {
    t,
    draft,
    language,
    setLanguage,
    version,
    languages,
    errors,
    setKind,
    setDestination,
    updateVersion,
    updateAudience,
    bodyRef,
    applyFormat,
    preview,
    previewable,
    reach,
    reachSettled,
    countries: countries.data ?? [],
    regions: regions.data ?? [],
    countryId,
    selectCountry,
    placesFailed: countries.isError || regions.isError,
    previewLanguage: debounced.language,
    working,
    testing: testMutation.isPending,
    sending: sendMutation.isPending,
    sendTest,
    confirming,
    openConfirm: () => setConfirming(true),
    closeConfirm: () => setConfirming(false),
    send,
  }
}
