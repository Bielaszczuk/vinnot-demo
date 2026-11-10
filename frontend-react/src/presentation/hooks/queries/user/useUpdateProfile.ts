/**
 * useUpdateProfile — mutation hook for updating current user's profile
 *
 * Calls usersService.updateUser and syncs the auth store.
 * Flow: page → hook → service → client → http
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateMyPoints } from '@hooks/queries/user/pointsCache'
import { usersService } from '@services/users.service'
import { useAuthStore } from '@stores/auth.store'
import type { User } from '@domain/user/user.types'

interface UpdateProfileParams {
  phoneNumber?: string
  username: string
  firstName?: string
  lastName?: string
}

export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser)
  const queryClient = useQueryClient()

  return useMutation<User, Error, UpdateProfileParams>({
    mutationFn: ({ username, firstName, lastName, phoneNumber }) =>
      usersService.updateUser({ username, firstName, lastName, phoneNumber }),
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      // A complete profile (photo, full name and phone) earns points once.
      invalidateMyPoints(queryClient)
    },
  })
}
