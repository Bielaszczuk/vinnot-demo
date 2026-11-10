/** Ensures that the multilingual AI profile exists without forcing regeneration. */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { AiWineProfile } from '@domain/wine/wine.types'
import { queryKeys } from '@hooks/queries/queryKeys'
import { winesService } from '@services/wines.service'

export function useGenerateAiProfile(wineId: string) {
  const queryClient = useQueryClient()
  const { i18n } = useTranslation()
  const language = i18n.language.startsWith('en') ? 'en' : 'es'

  return useMutation<AiWineProfile, Error>({
    mutationFn: () => winesService.generateAiProfile(wineId, language),
    onSuccess: (profile) => {
      // Show the new profile right away; a plain refetch would flash the empty state.
      queryClient.setQueryData(queryKeys.wines.aiProfile(wineId, language), profile)
      void queryClient.invalidateQueries({ queryKey: queryKeys.wines.aiProfiles(wineId) })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.wines.aiProfileStatus(wineId, language),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.wines.detail(wineId) })
    },
  })
}
