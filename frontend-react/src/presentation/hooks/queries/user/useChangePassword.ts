/**
 * useChangePassword — mutation hook for changing user password
 *
 * Calls usersService.changePassword(currentPassword, newPassword).
 * Flow: page → hook → service → client → http
 */
import { useMutation } from '@tanstack/react-query'
import { usersService } from '@services/users.service'

interface ChangePasswordParams {
  currentPassword: string
  newPassword: string
}

export function useChangePassword() {
  return useMutation<void, Error, ChangePasswordParams>({
    mutationFn: ({ currentPassword, newPassword }) =>
      usersService.changePassword(currentPassword, newPassword),
  })
}
