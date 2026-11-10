/**
 * useRemoveCellarEntry — mutation hook for removing a wine from the cellar
 *
 * Follows architecture: hook → service → client (no direct client access).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { cellarService } from '@services/cellar.service'

export function useRemoveCellarEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (cellarWineId: string) => cellarService.removeWine(cellarWineId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cellar.all })
    },
  })
}

