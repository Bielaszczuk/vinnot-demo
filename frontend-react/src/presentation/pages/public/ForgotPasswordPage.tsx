import { Link } from 'react-router-dom'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { AuthActionLayout, AuthActionMessage } from '@components/auth/AuthActionLayout'
import { useForgotPasswordViewModel } from './useAccountActionViewModels'

export function ForgotPasswordPage() {
  const { t, status, message, register, handleSubmit, onSubmit, formState: { errors, isSubmitting } } = useForgotPasswordViewModel()
  return (
    <AuthActionLayout title={t('auth.forgotPasswordTitle')} description={t('auth.forgotPasswordDescription')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label={t('auth.email')} type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <AuthActionMessage status={status} message={message} />
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting} isLoading={status === 'loading'}>
          {t('auth.sendResetLink')}
        </Button>
      </form>
      <Link to="/login" className="mt-6 block text-center text-sm font-semibold text-wine-700 hover:text-wine-800">{t('auth.backToLogin')}</Link>
    </AuthActionLayout>
  )
}
