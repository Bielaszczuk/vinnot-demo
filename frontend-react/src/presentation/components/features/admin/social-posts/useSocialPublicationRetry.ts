/** Retries the failed publication of one network of the selected post (#510), with its feedback. */
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@hooks/useToast'
import { useRetrySocialPublication } from '@hooks/queries/admin/useAdminSocialPosts'
import { isPublishingOff, isSocialPostConflict } from '@services/adminSocialPosts.service'
import type { SocialNetwork } from '@domain/admin/socialPost'

export function useSocialPublicationRetry(postId: string | undefined) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  const { addToast } = useToast()
  const mutation = useRetrySocialPublication()

  const retry = useCallback(async (network: SocialNetwork) => {
    if (!postId) return
    try {
      await mutation.mutateAsync({ id: postId, network })
      addToast({ type: 'success', message: t('admin.socialPosts.publications.retried') })
    } catch (error) {
      addToast({ type: 'error', message: t(retryErrorKey(error)) })
    }
  }, [addToast, mutation, postId, t])

  const formatNumber = useCallback((value: number) => value.toLocaleString(language), [language])

  return {
    retryingNetwork: mutation.isPending ? mutation.variables?.network ?? null : null,
    retry,
    formatNumber,
  }
}

function retryErrorKey(error: unknown): string {
  if (isPublishingOff(error)) return 'admin.socialPosts.publications.retryOff'
  return isSocialPostConflict(error) ? 'admin.socialPosts.publications.retryConflict' : 'admin.socialPosts.actions.error'
}
