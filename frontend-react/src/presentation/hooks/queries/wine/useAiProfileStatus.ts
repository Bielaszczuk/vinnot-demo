/**
 * useAiProfileStatus — fetch AI profile generation status for a wine
 */

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { winesService } from '@services/wines.service'
import type { AiProfileStatus } from '@domain/wine/wine.types'
import { useTranslation } from 'react-i18next'

export function useAiProfileStatus(wineId: string | undefined, enabled = true) {
  const { i18n } = useTranslation()
  const language = i18n.language.startsWith('en') ? 'en' : 'es'

  return useQuery<AiProfileStatus>({
    queryKey: queryKeys.wines.aiProfileStatus(wineId!, language),
    queryFn: () => winesService.getAiProfileStatus(wineId!, language),
    enabled: !!wineId && enabled,
  })
}
