/**
 * useUpdateSocialProfile — saves the public bio and the cellar visibility (PATCH /users/me).
 *
 * Syncs the session user and refreshes the cached public profiles.
 * Flow: page → hook → service → client → http
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { usersService, type SocialProfileInput } from '@services/users.service'
import { useAuthStore } from '@stores/auth.store'
import type { User } from '@domain/user/user.types'

export function useUpdateSocialProfile() {
  const setUser = useAuthStore((state) => state.setUser)
  const queryClient = useQueryClient()

  return useMutation<User, Error, SocialProfileInput>({
    mutationFn: (input) => usersService.updateSocialProfile(input),
    onSuccess: (user) => {
      setUser(user)
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.profiles() })
    },
  })
}
