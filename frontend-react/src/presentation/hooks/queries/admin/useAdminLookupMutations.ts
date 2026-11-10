import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { adminService } from '@services/admin.service'
import type { AdminRoute, AdminWine, AdminWinery } from '@domain/admin/admin.types'

export function useAdminWinerySearch() {
  return useMutation<{ items: AdminWinery[]; totalItems: number }, Error, { search: string; page?: number; size?: number }>({
    mutationFn: ({ search, page = 0, size = 10 }) => adminService.searchWineries(search, page, size),
  })
}

export function useAdminWineDetailMutation() {
  const queryClient = useQueryClient()
  return useMutation<AdminWine, Error, string>({
    mutationFn: (id) => adminService.getWine(id),
    onSuccess: (wine) => {
      queryClient.setQueryData(queryKeys.admin.wines.detail(wine.id), wine)
    },
  })
}

export function useAdminRouteDetailMutation() {
  const queryClient = useQueryClient()
  return useMutation<AdminRoute, Error, string>({
    mutationFn: (id) => adminService.getRoute(id),
    onSuccess: (route) => {
      queryClient.setQueryData(queryKeys.admin.routes.detail(route.id), route)
    },
  })
}

export function useAdminAiProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { wineId: string; profileJson: Record<string, unknown>; language: string }>({
    mutationFn: ({ wineId, profileJson, language }) => adminService.updateAiProfile(wineId, profileJson, language),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wines.aiProfiles(variables.wineId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.wines.detail(variables.wineId) })
    },
  })
}

export function useAdminWineryDetailMutation() {
  return useMutation<AdminWinery, Error, string>({ mutationFn: (id) => adminService.getWinery(id) })
}
