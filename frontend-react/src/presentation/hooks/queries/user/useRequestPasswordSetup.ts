import { useMutation } from '@tanstack/react-query'
import { authService } from '@services/auth.service'

export function useRequestPasswordSetup() {
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
  })
}
