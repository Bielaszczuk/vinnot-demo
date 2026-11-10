/**
 * useAdminWineMutations — create, update, delete wine mutations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { adminService } from '@services/admin.service'
import type { AdminWinePayload } from '@domain/admin/admin.types'

export function useCreateAdminWine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdminWinePayload) => adminService.createWine(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wines.all })
      qc.invalidateQueries({ queryKey: queryKeys.wineries.all })
      qc.invalidateQueries({ queryKey: queryKeys.cellar.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.wines.all() })
      qc.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })
}

export function useUpdateAdminWine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AdminWinePayload> }) =>
      adminService.updateWine(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wines.all })
      qc.invalidateQueries({ queryKey: queryKeys.wineries.all })
      qc.invalidateQueries({ queryKey: queryKeys.cellar.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.wines.all() })
    },
  })
}

export function useDeleteAdminWine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminService.deleteWine(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wines.all })
      qc.invalidateQueries({ queryKey: queryKeys.wineries.all })
      qc.invalidateQueries({ queryKey: queryKeys.cellar.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.wines.all() })
      qc.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })
}
