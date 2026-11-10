/**
 * useRegenerateAiProfile — force-regenerate AI wine profile
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { winesService } from '@services/wines.service'
import type { AiWineProfile } from '@domain/wine/wine.types'
import { useTranslation } from 'react-i18next'

export function useRegenerateAiProfile(wineId: string) {
  const queryClient = useQueryClient()
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('en') ? 'en' : 'es'

  return useMutation<AiWineProfile, Error>({
    mutationFn: () => winesService.regenerateAiProfile(wineId, lang),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wines.aiProfiles(wineId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.wines.aiProfileStatus(wineId, lang) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.wines.detail(wineId) })
    },
  })
}
