/**
 * useAdminWineryMutations — create, update, delete winery mutations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { adminService } from '@services/admin.service'
import type { AdminWineryPayload } from '@domain/admin/admin.types'

export function useCreateAdminWinery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdminWineryPayload) => adminService.createWinery(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wineries.all })
      qc.invalidateQueries({ queryKey: queryKeys.wines.all })
      qc.invalidateQueries({ queryKey: queryKeys.wineRoutes.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.wineries.all() })
      qc.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })
}

export function useUpdateAdminWinery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminWineryPayload }) =>
      adminService.updateWinery(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wineries.all })
      qc.invalidateQueries({ queryKey: queryKeys.wines.all })
      qc.invalidateQueries({ queryKey: queryKeys.wineRoutes.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.wineries.all() })
    },
  })
}

export function useDeleteAdminWinery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminService.deleteWinery(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wineries.all })
      qc.invalidateQueries({ queryKey: queryKeys.wines.all })
      qc.invalidateQueries({ queryKey: queryKeys.wineRoutes.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.wineries.all() })
      qc.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })
}
