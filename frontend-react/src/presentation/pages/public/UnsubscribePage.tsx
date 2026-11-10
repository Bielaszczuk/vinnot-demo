import { Link } from 'react-router-dom'
import { AuthActionLayout, AuthActionMessage } from '@components/auth/AuthActionLayout'
import { Button } from '@components/ui/Button'
import { useUnsubscribeViewModel } from './useUnsubscribeViewModel'

export function UnsubscribePage() {
  const { t, status, message, canConfirm, confirm } = useUnsubscribeViewModel()
  return (
    <AuthActionLayout title={t('unsubscribe.title')} description={t('unsubscribe.description')}>
      <AuthActionMessage status={status === 'failed' ? 'error' : status} message={message} />
      {(canConfirm || status === 'loading') && (
        <Button className="w-full" isLoading={status === 'loading'} onClick={confirm}>
          {t('unsubscribe.confirm')}
        </Button>
      )}
      <Link to="/profile?tab=notifications" className="mt-6 block text-center text-sm font-medium text-wine-700 hover:text-wine-800">
        {t('unsubscribe.managePreferences')}
      </Link>
    </AuthActionLayout>
  )
}
