/**
 * Network connections of the social media agent (#510 S5): the list, the OAuth connect (which leaves the app) and the
 * disconnect.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { adminSocialAccountsService } from '@services/adminSocialAccounts.service'
import type { SocialNetwork } from '@domain/admin/socialPost'

export const socialAccountKeys = {
  all: () => [...queryKeys.admin.all, 'social-accounts'] as const,
}

export function useAdminSocialAccounts() {
  return useQuery({
    queryKey: socialAccountKeys.all(),
    queryFn: () => adminSocialAccountsService.getAccounts(),
  })
}

/** On success the browser is already on its way to the network's OAuth page. */
export function useConnectSocialAccount() {
  return useMutation({
    mutationFn: (network: SocialNetwork) => adminSocialAccountsService.connect(network),
  })
}

export function useDisconnectSocialAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (network: SocialNetwork) => adminSocialAccountsService.disconnect(network),
    onSuccess: () => qc.invalidateQueries({ queryKey: socialAccountKeys.all() }),
  })
}
