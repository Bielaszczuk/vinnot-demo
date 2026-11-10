import { useMutation } from '@tanstack/react-query'
import { usersService } from '@services/users.service'

export function useRequestEmailChange() {
  return useMutation<string, Error, string>({
    mutationFn: (newEmail) => usersService.requestEmailChange(newEmail),
  })
}
