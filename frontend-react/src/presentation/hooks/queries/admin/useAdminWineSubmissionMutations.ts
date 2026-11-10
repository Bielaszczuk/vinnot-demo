import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AdminWineSubmissionDecisionInput } from '@domain/admin/admin.types'
import { adminService } from '@services/admin.service'
import { queryKeys } from '@hooks/queries/queryKeys'

export function useDecideAdminWineSubmission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminWineSubmissionDecisionInput }) =>
      adminService.decideWineSubmission(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wines.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.wineries.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.wineSubmissions.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.wines.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })
}
