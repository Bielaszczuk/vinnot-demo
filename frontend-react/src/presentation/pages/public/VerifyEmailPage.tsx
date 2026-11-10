import { Link } from 'react-router-dom'
import { AuthActionLayout, AuthActionMessage } from '@components/auth/AuthActionLayout'
import { useVerifyEmailViewModel } from './useAccountActionViewModels'

export function VerifyEmailPage() {
  const { t, status, message } = useVerifyEmailViewModel()
  return (
    <AuthActionLayout title={t('auth.verifyEmailTitle')} description={t('auth.verifyEmailDescription')}>
      <AuthActionMessage status={status} message={message} />
      {status === 'success' && <Link to="/login" className="mt-6 block rounded-xl bg-wine-700 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-wine-800">{t('auth.signIn')}</Link>}
    </AuthActionLayout>
  )
}
