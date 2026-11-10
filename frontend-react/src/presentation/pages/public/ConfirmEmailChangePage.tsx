import { Link } from 'react-router-dom'
import { AuthActionLayout, AuthActionMessage } from '@components/auth/AuthActionLayout'
import { useConfirmEmailChangeViewModel } from './useAccountActionViewModels'

export function ConfirmEmailChangePage() {
  const { t, status, message } = useConfirmEmailChangeViewModel()

  return (
    <AuthActionLayout
      title={t('auth.confirmEmailChangeTitle')}
      description={t('auth.confirmEmailChangeDescription')}
    >
      <AuthActionMessage status={status} message={message} />
      <Link
        to={status === 'success' ? '/login' : '/'}
        className="mt-6 block rounded-xl bg-wine-700 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-wine-800"
      >
        {status === 'success' ? t('auth.signInAgain') : t('common.back')}
      </Link>
    </AuthActionLayout>
  )
}
