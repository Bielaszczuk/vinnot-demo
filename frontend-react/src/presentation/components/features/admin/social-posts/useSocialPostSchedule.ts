/**
 * Reschedule and publish now of the selected post (#513), with their feedback: the date and time form works in the
 * planner zone (Argentina), and publishing now waits for a confirmation.
 */
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@hooks/useToast'
import { usePublishSocialPostNow, useRescheduleSocialPost } from '@hooks/queries/admin/useAdminSocialPosts'
import { scheduleActionError, type ScheduleActionError } from '@services/adminSocialPosts.service'
import {
  instantFromPlannerTime,
  plannerDateTime,
  type SocialPost,
  type ZonedDateTime,
} from '@domain/admin/socialPost'

const ERROR_KEYS: Record<ScheduleActionError, string> = {
  NOT_FUTURE: 'admin.socialPosts.schedule.errors.NOT_FUTURE',
  DATE_TAKEN: 'admin.socialPosts.schedule.errors.DATE_TAKEN',
  MEDIA_NOT_READY: 'admin.socialPosts.schedule.errors.MEDIA_NOT_READY',
  PUBLISHING_OFF: 'admin.socialPosts.schedule.errors.PUBLISHING_OFF',
  CONFLICT: 'admin.socialPosts.actions.conflict',
  OTHER: 'admin.socialPosts.actions.error',
}

/** The form belongs to the post it was opened for, so selecting another post closes it. */
type ScheduleForm = ZonedDateTime & { postId: string }

export function useSocialPostSchedule(post: SocialPost | undefined) {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const rescheduleMutation = useRescheduleSocialPost()
  const publishNowMutation = usePublishSocialPostNow()
  const [form, setForm] = useState<ScheduleForm | null>(null)
  const [confirmingFor, setConfirmingFor] = useState<string | null>(null)

  const postId = post?.id
  const openForm = form && form.postId === postId ? form : null
  const canSave = openForm !== null && instantFromPlannerTime(openForm.date, openForm.time) !== null

  const startReschedule = useCallback(() => {
    if (!post) return
    setConfirmingFor(null)
    setForm({ postId: post.id, ...plannerDateTime(post.scheduledFor) })
  }, [post])

  const setDate = useCallback((date: string) => setForm((current) => (current ? { ...current, date } : current)), [])
  const setTime = useCallback((time: string) => setForm((current) => (current ? { ...current, time } : current)), [])

  const fail = useCallback((error: unknown) => {
    addToast({ type: 'error', message: t(ERROR_KEYS[scheduleActionError(error)]) })
  }, [addToast, t])

  const saveSchedule = useCallback(async () => {
    if (!openForm || !canSave) return
    try {
      await rescheduleMutation.mutateAsync({ id: openForm.postId, date: openForm.date, time: openForm.time })
      addToast({ type: 'success', message: t('admin.socialPosts.schedule.saved') })
      setForm(null)
    } catch (error) {
      fail(error)
    }
  }, [addToast, canSave, fail, openForm, rescheduleMutation, t])

  const startPublishNow = useCallback(() => {
    if (!postId) return
    setForm(null)
    setConfirmingFor(postId)
  }, [postId])

  const confirmPublishNow = useCallback(async () => {
    if (!postId || confirmingFor !== postId) return
    try {
      await publishNowMutation.mutateAsync(postId)
      addToast({ type: 'success', message: t('admin.socialPosts.schedule.publishing') })
      setConfirmingFor(null)
    } catch (error) {
      fail(error)
    }
  }, [addToast, confirmingFor, fail, postId, publishNowMutation, t])

  // 24-hour Argentina time in every UI language, the same clock the form uses (e.g. `19:30`).
  const formatTime = useCallback((iso: string) => plannerDateTime(iso).time, [])

  return {
    rescheduling: openForm !== null,
    date: openForm?.date ?? '',
    time: openForm?.time ?? '',
    canSave,
    setDate,
    setTime,
    startReschedule,
    cancelReschedule: () => setForm(null),
    saveSchedule,
    confirmingPublishNow: postId !== undefined && confirmingFor === postId,
    startPublishNow,
    cancelPublishNow: () => setConfirmingFor(null),
    confirmPublishNow,
    busy: rescheduleMutation.isPending || publishNowMutation.isPending,
    formatTime,
  }
}
