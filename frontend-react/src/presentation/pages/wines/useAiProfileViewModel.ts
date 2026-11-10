import { useMemo, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useWine } from '@hooks/queries/wine/useWine'
import { useAiProfile } from '@hooks/queries/wine/useAiProfile'
import { useGenerateAiProfile } from '@hooks/queries/wine/useGenerateAiProfile'
import { useToast } from '@hooks/useToast'
import { queryKeys } from '@hooks/queries/queryKeys'
import { useBackNavigation } from '@hooks/useBackNavigation'
import { buildProfileArtView } from './aiProfileArt'

export function useAiProfileViewModel() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { addToast } = useToast()

  const { data: wine } = useWine(id)
  const { data: profile, isLoading, isError, error } = useAiProfile(id)
  const generate = useGenerateAiProfile(id ?? '')
  const autoGenerateTriggered = useRef<string | undefined>(undefined)
  const shouldAutoGenerate = useMemo(
    () => new URLSearchParams(location.search).get('generate') === '1',
    [location.search],
  )

  const handleRegenerate = useCallback(async () => {
    try {
      await generate.mutateAsync()
      addToast({ type: 'success', message: t('common.success') })
    } catch {
      addToast({ type: 'error', message: t('aiProfile.errorTitle') })
    }
  }, [addToast, generate, t])

  const back = useBackNavigation(id ? `/wines/${id}` : '/wines')
  const goBack = useCallback(async () => {
    if (id) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.wines.detail(id) })
    }
    back()
  }, [back, id, queryClient])

  useEffect(() => {
    if (!shouldAutoGenerate) {
      autoGenerateTriggered.current = undefined
      return
    }
    if (!id || autoGenerateTriggered.current === id) return
    autoGenerateTriggered.current = id
    const search = new URLSearchParams(location.search)
    search.delete('generate')
    navigate({ pathname: location.pathname, search: search.toString() }, { replace: true })
    void handleRegenerate()
  }, [handleRegenerate, id, location.pathname, location.search, navigate, shouldAutoGenerate])

  const palateAnalysis = profile?.palateAnalysis
  const art = useMemo(() => buildProfileArtView(profile), [profile])

  return {
    id,
    t,
    wine,
    profile,
    isLoading,
    isError,
    error,
    regeneratePending: generate.isPending,
    handleRegenerate,
    goBack,
    palateAnalysis,
    art,
  }
}
