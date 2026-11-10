import { useQuery } from '@tanstack/react-query'
import { paymentAccountService } from '@/application/services/paymentAccount.instance'
import { useAuth } from './useAuth'
import { ROLES } from '@/shared/config/roles'

export function usePaymentAccountStatus() {
  const auth = useAuth()
  return useQuery({
    queryKey: ['paymentAccount', auth.user?.id],
    queryFn: () => paymentAccountService.status(),
    enabled:
      auth.isAuthenticated && auth.hasAnyRole([ROLES.ADMIN, ROLES.PARTNER]),
    staleTime: 0,
    refetchOnWindowFocus: 'always',
    retry: false,
  })
}
