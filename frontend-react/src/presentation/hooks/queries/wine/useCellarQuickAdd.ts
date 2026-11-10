/**
 * useCellarQuickAdd — mutation hook for quick-adding a wine to cellar
 *
 * Used by CellarQuickAddModal in the wine module.
 * Follows architecture: hook → service → client (no direct client access).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { invalidateMyPoints } from '@hooks/queries/user/pointsCache'
import { cellarService } from '@services/cellar.service'

interface QuickAddPayload {
  wineId: string
  rating: number | null
  purchasePrice: number | null
  notes: string | null
  vintage?: number | null
}

export function useCellarQuickAdd() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: QuickAddPayload) =>
      cellarService.quickAddWine(payload),
    onSuccess: (_data, { wineId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cellar.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.wines.detail(wineId) })
      invalidateMyPoints(queryClient)
    },
  })
}

