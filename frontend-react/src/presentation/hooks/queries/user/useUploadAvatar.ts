/**
 * useUploadAvatar — mutation hook for uploading user avatar
 *
 * Calls usersService.uploadAvatar(file) and syncs the auth store.
 * Flow: page → hook → service → client → http
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateMyPoints } from '@hooks/queries/user/pointsCache'
import { usersService } from '@services/users.service'
import { useAuthStore } from '@stores/auth.store'

export function useUploadAvatar() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const queryClient = useQueryClient()

  return useMutation<string, Error, File>({
    mutationFn: (file: File) => usersService.uploadAvatar(file),
    onSuccess: (avatarUrl) => {
      if (user) {
        setUser({ ...user, avatar: avatarUrl })
      }
      invalidateMyPoints(queryClient)
    },
  })
}

