import { useMutation } from '@tanstack/react-query'
import { usersService } from '@services/users.service'

export function useDeactivateAccount() {
  return useMutation<void, Error>({
    mutationFn: () => usersService.deactivateAccount(),
  })
}
