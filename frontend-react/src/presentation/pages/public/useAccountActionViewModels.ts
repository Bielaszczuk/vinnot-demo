import { authErrorMessage } from '@presentation/feedback/authErrorMessage'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  emailActionSchema,
  resetPasswordSchema,
  type EmailActionInput,
  type ResetPasswordInput,
} from '@domain/user/user.validators'
import {
  AuthApiError,
  authService,
  type PasswordResetTokenStatus,
} from '@services/auth.service'

type ActionStatus = 'idle' | 'loading' | 'success' | 'error'

export function useForgotPasswordViewModel() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<ActionStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const form = useForm<EmailActionInput>({
    resolver: zodResolver(emailActionSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = useCallback(async ({ email }: EmailActionInput) => {
    setStatus('loading')
    setMessage(null)
    try {
      await authService.forgotPassword(email)
      setMessage(t('auth.resetLinkSent'))
      setStatus('success')
    } catch (error) {
      setMessage(authErrorMessage(error, t, 'account'))
      setStatus('error')
    }
  }, [t])

  return { t, status, message, onSubmit, ...form }
}

export function useResetPasswordViewModel() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [tokenStatus, setTokenStatus] = useState<PasswordResetTokenStatus | null>(
    token ? null : 'INVALID',
  )
  const [status, setStatus] = useState<ActionStatus>(token ? 'loading' : 'error')
  const [message, setMessage] = useState<string | null>(
    token ? t('auth.validatingResetLink') : t('auth.missingActionToken'),
  )
  const validationStarted = useRef(false)
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (!token || validationStarted.current) return
    validationStarted.current = true
    void authService.validatePasswordResetToken(token)
      .then(({ status: nextTokenStatus }) => {
        setTokenStatus(nextTokenStatus)
        if (nextTokenStatus === 'VALID') {
          setMessage(null)
          setStatus('idle')
          return
        }
        const messageKey = nextTokenStatus === 'USED'
          ? 'auth.resetLinkUsed'
          : nextTokenStatus === 'EXPIRED'
            ? 'auth.resetLinkExpired'
            : 'auth.resetLinkInvalid'
        setMessage(t(messageKey))
        setStatus('error')
      })
      .catch((error: unknown) => {
        setMessage(authErrorMessage(error, t, 'account'))
        setStatus('error')
      })
  }, [t, token])

  const onSubmit = useCallback(async ({ password }: ResetPasswordInput) => {
    if (!token) return
    setStatus('loading')
    setMessage(null)
    try {
      await authService.resetPassword(token, password)
      setMessage(t('auth.passwordResetDone'))
      setStatus('success')
    } catch (error) {
      if (error instanceof AuthApiError && error.code === 'INVALID_OR_EXPIRED_TOKEN') {
        setTokenStatus('INVALID')
        setMessage(t('auth.resetLinkInvalid'))
        setStatus('error')
        return
      }
      setMessage(authErrorMessage(error, t, 'account'))
      setStatus('error')
    }
  }, [t, token])

  return { t, tokenStatus, status, message, onSubmit, ...form }
}

export function useVerifyEmailViewModel() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [status, setStatus] = useState<ActionStatus>(token ? 'loading' : 'error')
  const [message, setMessage] = useState<string>(
    token ? t('auth.verifyingEmail') : t('auth.missingActionToken'),
  )
  const requestStarted = useRef(false)

  useEffect(() => {
    if (!token || requestStarted.current) return
    requestStarted.current = true
    void authService.verifyEmail(token)
      .then(() => {
        setMessage(t('auth.emailVerified'))
        setStatus('success')
      })
      .catch((error: unknown) => {
        setMessage(authErrorMessage(error, t, 'account'))
        setStatus('error')
      })
  }, [t, token])

  return { t, status, message }
}

export function useConfirmEmailChangeViewModel() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [status, setStatus] = useState<ActionStatus>(token ? 'loading' : 'error')
  const [message, setMessage] = useState<string>(
    token ? t('auth.confirmingEmailChange') : t('auth.missingActionToken'),
  )
  const requestStarted = useRef(false)

  useEffect(() => {
    if (!token || requestStarted.current) return
    requestStarted.current = true
    void authService.confirmEmailChange(token)
      .then(() => {
        setMessage(t('auth.emailChangeConfirmed'))
        setStatus('success')
      })
      .catch((error: unknown) => {
        setMessage(authErrorMessage(error, t, 'account'))
        setStatus('error')
      })
  }, [t, token])

  return { t, status, message }
}

export function useRegistrationPendingViewModel() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [status, setStatus] = useState<ActionStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const resend = useCallback(async () => {
    if (!email) {
      setStatus('error')
      setMessage(t('auth.missingVerificationEmail'))
      return
    }
    setStatus('loading')
    setMessage(null)
    try {
      await authService.resendVerification(email)
      setMessage(t('auth.verificationSent'))
      setStatus('success')
    } catch (error) {
      setMessage(authErrorMessage(error, t, 'account'))
      setStatus('error')
    }
  }, [email, t])

  return { t, email, status, message, resend }
}
