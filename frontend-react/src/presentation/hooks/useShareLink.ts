import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { ShareContentInput } from '@domain/sharing/contentLink'
import { sharingService } from '@services/sharing.service'
import { useToast } from './useToast'

export function useShareLink() {
  const { t } = useTranslation()
  const { addToast } = useToast()
  return useCallback(async (data: ShareContentInput) => {
    const result = await sharingService.shareContent(data)
    if (result === 'copied') addToast({ type: 'success', message: t('events.linkCopied') })
    if (result === 'failed') addToast({ type: 'error', message: t('common.shareFailed') })
    return result
  }, [addToast, t])
}
