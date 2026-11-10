import { useMutation } from '@tanstack/react-query'
import { usersService } from '@services/users.service'
import { useAuthStore } from '@stores/auth.store'
import type { User } from '@domain/user/user.types'

export function useCompleteOnboarding() {
  const setUser = useAuthStore((state) => state.setUser)

  return useMutation<User, Error, string | undefined>({
    mutationFn: (username) => usersService.completeOnboarding(username),
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
    },
  })
}
