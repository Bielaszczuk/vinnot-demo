import { AuthEditorialPanel } from '@components/auth/AuthEditorialPanel'
import { VinnotBrand } from '@components/brand/VinnotBrand'
/**
 * LoginPage — split-panel login using the native Vinnot visual language
 */

import { Navigate, Link } from 'react-router-dom'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { AlertBanner } from '@components/feedback/AlertBanner'
import { useLoginViewModel } from './useLoginViewModel'
import { AuthSocialButtons } from '@components/auth/AuthSocialButtons'

export function LoginPage() {
  const {
    t,
    isAuthenticated,
    authenticatedDestination,
    registerPath,
    serverError,
    visible,
    onSubmit,
    busyProvider,
    verificationEmail,
    handleProviderRequest,
    handleGoogleCredential,
    handleProviderError,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useLoginViewModel()

  if (isAuthenticated) {
    return <Navigate to={authenticatedDestination} replace />
  }

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-3 py-6 sm:px-4 sm:py-8">
      <div
        className={`grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-xl shadow-gray-300/40 motion-reduce:transition-none transition-all duration-700 lg:grid-cols-2 sm:rounded-3xl ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <AuthEditorialPanel className="" />

        {/* ═══ RIGHT PANEL — form ═══ */}
        <div className="flex flex-col justify-center p-6 sm:p-8 md:p-10 lg:p-12">
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
              {t('auth.welcomeTo')} <span className="text-wine-700">vinnot</span>
            </h1>
            <p className="mt-1 text-sm text-gray-500">{t('auth.signInToContinue')}</p>
          </div>

          <AuthSocialButtons
            disabled={isSubmitting}
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label={t('auth.email')}
              type="email"
              autoComplete="email"
              placeholder="your@email.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label={t('auth.password')}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-xs font-medium text-wine-600 transition-colors hover:text-wine-700" tabIndex={-1}>
                {t('auth.forgotPassword')}
              </Link>
            </div>

            {serverError && <AlertBanner variant="error">{serverError}</AlertBanner>}

            {verificationEmail && (
              <Link
                to={`/register/success?email=${encodeURIComponent(verificationEmail)}`}
                className="block text-center text-xs font-semibold text-wine-700 hover:text-wine-800"
              >
                {t('auth.resendVerification')}
              </Link>
            )}

            <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
              {t('auth.signIn')}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-gray-500 sm:mt-8">
            {t('auth.noAccount')}{' '}
            <Link to={registerPath} className="font-semibold text-wine-700 transition-colors hover:text-wine-800">
              {t('auth.signUpFree')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
