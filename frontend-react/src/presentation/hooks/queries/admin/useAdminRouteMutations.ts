/**
 * useAdminRouteMutations — create, update, delete route mutations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { adminService } from '@services/admin.service'
import type { AdminRoutePayload } from '@domain/admin/admin.types'

export function useCreateAdminRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdminRoutePayload) => adminService.createRoute(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wineRoutes.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.routes.all() })
      qc.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })
}

export function useUpdateAdminRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminRoutePayload }) =>
      adminService.updateRoute(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wineRoutes.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.routes.all() })
    },
  })
}

export function useDeleteAdminRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminService.deleteRoute(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wineRoutes.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.routes.all() })
      qc.invalidateQueries({ queryKey: queryKeys.admin.stats() })
    },
  })
}
