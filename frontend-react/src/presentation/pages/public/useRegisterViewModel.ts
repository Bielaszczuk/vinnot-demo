import { authErrorMessage } from '@presentation/feedback/authErrorMessage'
import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { registerUserSchema, type RegisterUserInput } from '@domain/user/user.validators'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@hooks/useToast'
import { AuthApiError, AuthValidationError } from '@services/auth.service'
import { useLegalAgreement } from "@/presentation/hooks/useLegalAgreement"
import { useAuthReturnPath } from '@hooks/useAuthReturnPath'
import { socialAuthService } from '@services/socialAuth.service'

export function useRegisterViewModel() {
  const { t } = useTranslation()
  const agreement = useLegalAgreement("registration")
  const navigate = useNavigate()
  const { from, loginPath, returnSearch, onboardingPath } = useAuthReturnPath()
  const { register: authRegister, socialLogin, isAuthenticated, user } = useAuth()
  const { addToast } = useToast()

  const [serverError, setServerError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [busyProvider, setBusyProvider] = useState<string | null>(null)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const form = useForm<RegisterUserInput>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
    },
  })

  const onSubmit = useCallback(
    async (data: RegisterUserInput) => {
      setServerError(null)
      if (!agreement.selection || agreement.error) return
      try {
        const result = await authRegister(
          data.username,
          data.email,
          data.password,
          data.firstName,
          data.lastName,
          agreement.selection,
        )
        addToast({ type: 'success', message: t('auth.verificationSent') })
        navigate(`/register/success?email=${encodeURIComponent(result.email)}${returnSearch.replace(/^\?/, "&")}`, {
          replace: true,
        })
      } catch (error) {
        setServerError(authErrorMessage(error, t, 'register'))
        if (error instanceof AuthValidationError) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            if (messages.length > 0 && Object.hasOwn(registerUserSchema.shape, field)) {
              form.setError(field as keyof RegisterUserInput, {
                type: 'server',
                message: 'auth.errors.invalidField',
              })
            }
          }
        } else if (error instanceof AuthApiError) {
          if (error.code === "TERMS_VERSION_CHANGED") agreement.retry()
        }
      }
    },
    [addToast, authRegister, form, navigate, t, agreement, returnSearch],
  )

  const completeSocialLogin = useCallback(async (
    request: Parameters<typeof socialLogin>[0],
  ) => {
    setServerError(null)
    setBusyProvider(request.provider)
    try {
      const result = await socialLogin(request)
      addToast({ type: 'success', message: t('auth.loginSuccess') })
      navigate(result.user.onboardingCompleted ? from : onboardingPath, { replace: true })
    } catch (error) {
      setServerError(authErrorMessage(error, t, 'social'))
    } finally {
      setBusyProvider(null)
    }
  }, [addToast, navigate, socialLogin, t, from, onboardingPath])

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
    agreement,
    isAuthenticated,
    authenticatedDestination: user?.onboardingCompleted === false ? onboardingPath : from,
    loginPath,
    serverError,
    visible,
    onSubmit,
    busyProvider,
    handleProviderRequest,
    handleGoogleCredential,
    handleProviderError,
    ...form,
  }
}
