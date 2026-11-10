/**
 * Admin app versions (#428): the minimum supported mobile version per platform and its recent changes.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { adminAppVersionsService } from '@services/adminAppVersions.service'
import type { AppPlatform } from '@domain/admin/appVersion'

export function useAppVersionSettings() {
  return useQuery({
    queryKey: queryKeys.admin.appVersions(),
    queryFn: () => adminAppVersionsService.getSettings(),
  })
}

export function useSetMinimumAppVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ platform, minimumVersion }: { platform: AppPlatform; minimumVersion: string | null }) =>
      adminAppVersionsService.setMinimumVersion(platform, minimumVersion),
    onSuccess: (settings) => qc.setQueryData(queryKeys.admin.appVersions(), settings),
  })
}
