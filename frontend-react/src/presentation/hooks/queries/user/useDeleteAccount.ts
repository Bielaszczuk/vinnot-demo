import { useMutation } from '@tanstack/react-query'
import { usersService, type DeleteAccountInput } from '@services/users.service'

export function useDeleteAccount() {
  return useMutation<void, Error, DeleteAccountInput | undefined>({
    mutationFn: (input) => usersService.deleteAccount(input),
  })
}
