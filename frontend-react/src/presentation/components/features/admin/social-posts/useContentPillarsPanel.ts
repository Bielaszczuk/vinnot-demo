/** The content pillars panel (#510): the pillars, their two switches and why a switch was refused. */
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@hooks/useToast'
import { useAdminContentPillars, useSetPillarActive, useSetPillarAutoApprove } from '@hooks/queries/admin/useAdminSocialPosts'
import { isLastRotatingPillar } from '@services/adminSocialPosts.service'
import type { ContentPillarSettings } from '@domain/admin/socialPost'

export function useContentPillarsPanel() {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  const { addToast } = useToast()
  const query = useAdminContentPillars()
  const activeMutation = useSetPillarActive()
  const autoApproveMutation = useSetPillarAutoApprove()

  const save = useCallback(async (action: () => Promise<unknown>) => {
    try {
      await action()
      addToast({ type: 'success', message: t('admin.socialPosts.pillars.saved') })
    } catch (error) {
      addToast({ type: 'error', message: t(isLastRotatingPillar(error) ? 'admin.socialPosts.pillars.lastRotating' : 'admin.socialPosts.pillars.error') })
    }
  }, [addToast, t])

  const toggleActive = useCallback((pillar: ContentPillarSettings) =>
    save(() => activeMutation.mutateAsync({ code: pillar.code, enabled: !pillar.active })), [activeMutation, save])

  const toggleAutoApprove = useCallback((pillar: ContentPillarSettings) =>
    save(() => autoApproveMutation.mutateAsync({ code: pillar.code, enabled: !pillar.autoApprove })), [autoApproveMutation, save])

  const formatNumber = useCallback((value: number) => value.toLocaleString(language), [language])

  const switching = activeMutation.isPending
    ? activeMutation.variables?.code ?? null
    : autoApproveMutation.isPending ? autoApproveMutation.variables?.code ?? null : null

  return {
    pillars: query.data ?? [],
    loading: query.isLoading,
    failed: query.isError,
    refetch: query.refetch,
    switching,
    formatNumber,
    toggleActive,
    toggleAutoApprove,
  }
}
