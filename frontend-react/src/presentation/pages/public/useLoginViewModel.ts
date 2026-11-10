import { authErrorMessage } from '@presentation/feedback/authErrorMessage'
import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { loginUserSchema, type LoginUserInput } from '@domain/user/user.validators'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@hooks/useToast'
import { useConfirm } from '@hooks/useConfirm'
import { AuthApiError, type AuthResult } from '@services/auth.service'
import { socialAuthService } from '@services/socialAuth.service'
import { useAuthReturnPath } from '@hooks/useAuthReturnPath'

function isDeactivated(error: unknown): boolean {
  return error instanceof AuthApiError && error.code === 'ACCOUNT_DEACTIVATED'
}

export function useLoginViewModel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { from, registerPath, onboardingPath } = useAuthReturnPath()
  const { login, socialLogin, isAuthenticated, user } = useAuth()
  const { addToast } = useToast()
  const { confirm } = useConfirm()

  const [serverError, setServerError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [busyProvider, setBusyProvider] = useState<string | null>(null)
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const form = useForm<LoginUserInput>({
    resolver: zodResolver(loginUserSchema),
    defaultValues: { email: '', password: '' },
  })

  const finishLogin = useCallback((result: AuthResult) => {
    addToast({ type: 'success', message: t('auth.loginSuccess') })
    navigate(result.user.onboardingCompleted ? from : onboardingPath, { replace: true })
  }, [addToast, from, navigate, onboardingPath, t])

  /** A deactivated account comes back only after the person confirms, as in the app. */
  const confirmReactivation = useCallback(() => confirm({
    title: t('auth.reactivateAccountTitle'),
    message: t('auth.reactivateAccountMessage'),
    confirmLabel: t('auth.reactivateAccountAction'),
    cancelLabel: t('common.cancel'),
  }), [confirm, t])

  const onSubmit = useCallback(
    async (data: LoginUserInput) => {
      setServerError(null)
      setVerificationEmail(null)
      try {
        finishLogin(await login(data.email, data.password))
      } catch (error) {
        if (isDeactivated(error)) {
          if (!await confirmReactivation()) return
          try {
            finishLogin(await login(data.email, data.password, true))
          } catch (reactivationError) {
            setServerError(authErrorMessage(reactivationError, t, 'login'))
          }
          return
        }
        setServerError(authErrorMessage(error, t, 'login'))
        if (error instanceof AuthApiError && error.code === 'EMAIL_NOT_VERIFIED') {
          setVerificationEmail(data.email)
        }
      }
    },
    [confirmReactivation, finishLogin, login, t],
  )

  const completeSocialLogin = useCallback(async (
    request: Parameters<typeof socialLogin>[0],
  ) => {
    setServerError(null)
    setBusyProvider(request.provider)
    try {
      try {
        finishLogin(await socialLogin(request))
      } catch (error) {
        if (!isDeactivated(error) || request.reactivate) throw error
        if (await confirmReactivation()) finishLogin(await socialLogin({ ...request, reactivate: true }))
      }
    } catch (error) {
      setServerError(authErrorMessage(error, t, 'social'))
    } finally {
      setBusyProvider(null)
    }
  }, [confirmReactivation, finishLogin, socialLogin, t])

  const handleProviderRequest = useCallback(async (provider: 'APPLE' | 'FACEBOOK') => {
    try {
      setBusyProvider(provider)
      await completeSocialLogin(await socialAuthService.acquire(provider))
    } catch (error) {
      setBusyProvider(null)
      setServerError(authErrorMessage(error, t, 'social'))
    }
  }, [completeSocialLogin, t])

  const handleGoogleCredential = useCallback((_provider: 'GOOGLE', token: string) => {
    void completeSocialLogin({ provider: 'GOOGLE', token })
  }, [completeSocialLogin])

  const handleProviderError = useCallback((provider: 'GOOGLE' | 'APPLE' | 'FACEBOOK') => {
    setServerError(t('auth.socialLoginError', { provider }))
  }, [t])

  return {
    t,
    isAuthenticated,
    authenticatedDestination: user?.onboardingCompleted === false ? onboardingPath : from,
    registerPath,
    serverError,
    visible,
    onSubmit,
    busyProvider,
    verificationEmail,
    handleProviderRequest,
    handleGoogleCredential,
    handleProviderError,
    ...form,
  }
}
