/**
 * useAdminReviewMutations — delete review mutation
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { adminService } from '@services/admin.service'

export function useDeleteAdminReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminService.deleteReview(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wines.all })
      qc.invalidateQueries({ queryKey: queryKeys.cellar.all })
      qc.invalidateQueries({ queryKey: queryKeys.users.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.reviews.all() })
      qc.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })
}
