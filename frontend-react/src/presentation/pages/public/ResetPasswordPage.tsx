import { Link } from 'react-router-dom'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { AuthActionLayout, AuthActionMessage } from '@components/auth/AuthActionLayout'
import { useResetPasswordViewModel } from './useAccountActionViewModels'
import { fieldErrorMessage } from '@presentation/feedback/fieldErrorMessage'

export function ResetPasswordPage() {
  const { t, tokenStatus, status, message, register, handleSubmit, onSubmit, formState: { errors, isSubmitting } } = useResetPasswordViewModel()
  const canResetPassword = tokenStatus === 'VALID'
  const unavailable = tokenStatus !== null && !canResetPassword
  return (
    <AuthActionLayout
      title={t(unavailable ? 'auth.resetLinkUnavailableTitle' : 'auth.resetPasswordTitle')}
      description={t(unavailable ? 'auth.resetLinkUnavailableDescription' : 'auth.resetPasswordDescription')}
    >
      {status !== 'success' && canResetPassword && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input label={t('auth.newPassword')} type="password" autoComplete="new-password" error={fieldErrorMessage(t, errors.password)} {...register('password')} />
          <Input label={t('auth.confirmPassword')} type="password" autoComplete="new-password" error={fieldErrorMessage(t, errors.confirmPassword)} {...register('confirmPassword')} />
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting} isLoading={status === 'loading'}>
          {t('auth.resetPasswordButton')}
        </Button>
        </form>
      )}
      <div className="mt-4"><AuthActionMessage status={status} message={message} /></div>
      {unavailable && (
        <Link to="/forgot-password" className="mt-6 block text-center text-sm font-semibold text-wine-700 hover:text-wine-800">
          {t('auth.requestNewResetLink')}
        </Link>
      )}
      <Link to="/login" className="mt-6 block text-center text-sm font-semibold text-wine-700 hover:text-wine-800">{t('auth.backToLogin')}</Link>
    </AuthActionLayout>
  )
}
