/**
 * useUpdateCellarEntry — mutation hook for updating a cellar entry (rating, price, notes)
 *
 * Follows architecture: hook → service → client (no direct client access).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { cellarService } from '@services/cellar.service'
import type { UpdateCellarEntryOptions } from '@domain/cellar/cellar.types'

export function useUpdateCellarEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ cellarWineId, updates }: { cellarWineId: string; updates: UpdateCellarEntryOptions }) =>
      cellarService.updateWine(cellarWineId, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cellar.all })
    },
  })
}

