/**
 * useAiProfile — fetch AI wine profile; `null` means no profile was generated yet
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { winesService } from '@services/wines.service'
import type { AiWineProfile } from '@domain/wine/wine.types'
import { useTranslation } from 'react-i18next'

export function useAiProfile(wineId: string | undefined, enabled = true) {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('en') ? 'en' : 'es'

  return useQuery<AiWineProfile | null>({
    queryKey: queryKeys.wines.aiProfile(wineId!, lang),
    queryFn: () => winesService.getAiProfile(wineId!, lang),
    enabled: !!wineId && enabled,
  })
}
