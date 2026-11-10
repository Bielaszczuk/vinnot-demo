import { useAuthReturnPath } from '@hooks/useAuthReturnPath'
import { Link } from 'react-router-dom'
import { Button } from '@components/ui/Button'
import { AuthActionLayout, AuthActionMessage } from '@components/auth/AuthActionLayout'
import { useRegistrationPendingViewModel } from './useAccountActionViewModels'

export function RegistrationPendingPage() {
  const { loginPath } = useAuthReturnPath()
  const { t, email, status, message, resend } = useRegistrationPendingViewModel()
  return (
    <AuthActionLayout title={t('auth.checkEmailTitle')} description={t('auth.checkEmailDescription', { email })}>
      <AuthActionMessage status={status} message={message} />
      <Button variant="secondary" size="lg" className="mt-5 w-full" disabled={!email} isLoading={status === 'loading'} onClick={() => void resend()}>
        {t('auth.resendVerification')}
      </Button>
      <Link to={loginPath} className="mt-6 block text-center text-sm font-semibold text-wine-700 hover:text-wine-800">{t('auth.backToLogin')}</Link>
    </AuthActionLayout>
  )
}
