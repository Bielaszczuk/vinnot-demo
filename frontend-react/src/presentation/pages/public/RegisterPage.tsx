import { AuthEditorialPanel } from '@components/auth/AuthEditorialPanel'
import { VinnotBrand } from '@components/brand/VinnotBrand'
/**
 * RegisterPage — split-panel registration using the native Vinnot visual language
 */

import { TermsReview } from "@components/auth/TermsReview"
import { Navigate, Link } from 'react-router-dom'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { AlertBanner } from '@components/feedback/AlertBanner'
import { useRegisterViewModel } from './useRegisterViewModel'
import { PasswordWithStrength } from './RegisterPasswordWithStrength'
import { AuthSocialButtons } from '@components/auth/AuthSocialButtons'
import { fieldErrorMessage } from '@presentation/feedback/fieldErrorMessage'

export function RegisterPage() {
  const {
    t,
    agreement,
    isAuthenticated,
    authenticatedDestination,
    loginPath,
    serverError,
    visible,
    onSubmit,
    busyProvider,
    handleProviderRequest,
    handleGoogleCredential,
    handleProviderError,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useRegisterViewModel()

  if (isAuthenticated) {
    return <Navigate to={authenticatedDestination} replace />
  }

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-3 py-6 sm:px-4 sm:py-8">
      <div
        className={`grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-xl shadow-gray-300/40 motion-reduce:transition-none transition-all duration-700 lg:grid-cols-5 sm:rounded-3xl ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <AuthEditorialPanel className="lg:col-span-2" />

        {/* ═══ RIGHT PANEL — form (3/5) ═══ */}
        <div className="flex flex-col justify-center p-6 sm:p-8 md:p-10 lg:col-span-3 lg:p-12">
          {/* Mobile-only header */}
          <div className="mb-6 lg:hidden">
            <div className="text-center">
              <Link to="/" aria-label="Vinnot" className="mb-4 inline-flex text-wine-700">
                <VinnotBrand />
              </Link>
            </div>
          </div>

          <div className="mb-6 sm:mb-8">
            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
              {t('auth.createAccount')}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{t('auth.joinCommunity')}</p>
          </div>

          <AuthSocialButtons
            disabled={isSubmitting || !agreement.selection || agreement.error}
            busyProvider={busyProvider}
            onCredential={handleGoogleCredential}
            onProviderRequest={handleProviderRequest}
            onProviderError={handleProviderError}
          />

          {/* Divider */}
          <div className="relative mb-5 sm:mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs uppercase tracking-wider text-gray-400">
                {t('auth.orContinueWith')}
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
            {serverError && <AlertBanner variant="error">{serverError}</AlertBanner>}

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input
                label={t('auth.username')}
                autoComplete="username"
                placeholder={t('auth.usernamePlaceholder')}
                error={fieldErrorMessage(t, errors.username)}
                {...register('username')}
              />
              <Input
                label={t('auth.email')}
                type="email"
                autoComplete="email"
                placeholder="your@email.com"
                error={fieldErrorMessage(t, errors.email)}
                {...register('email')}
              />
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input
                label={t('auth.firstName')}
                autoComplete="given-name"
                placeholder={t('auth.firstNamePlaceholder')}
                error={fieldErrorMessage(t, errors.firstName)}
                {...register('firstName')}
              />
              <Input
                label={t('auth.lastName')}
                autoComplete="family-name"
                placeholder={t('auth.lastNamePlaceholder')}
                error={fieldErrorMessage(t, errors.lastName)}
                {...register('lastName')}
              />
            </div>

            <PasswordWithStrength
              label={t('auth.password')}
              placeholder="••••••••"
              error={fieldErrorMessage(t, errors.password)}
              hint={t('auth.passwordHint')}
              {...register('password')}
            />

            <Input
              label={t('auth.confirmPassword')}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              error={fieldErrorMessage(t, errors.confirmPassword)}
              {...register('confirmPassword')}
            />

            <TermsReview agreement={agreement} />

            <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
              {t('auth.createAccountButton')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 sm:mt-8">
            {t('auth.hasAccount')}{' '}
            <Link to={loginPath} className="font-semibold text-wine-700 transition-colors hover:text-wine-800">
              {t('auth.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
