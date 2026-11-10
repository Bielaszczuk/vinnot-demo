import { useAuthReturnPath } from '@hooks/useAuthReturnPath'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthActionLayout, AuthActionMessage } from '@components/auth/AuthActionLayout'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { useAuth } from '@hooks/useAuth'
import { useCompleteOnboarding } from '@hooks/queries/user/useCompleteOnboarding'
import { usernameSchema } from '@domain/user/user.validators'
import { apiErrorMessage } from '@/presentation/feedback/apiErrorMessage'

export function CompleteProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { from } = useAuthReturnPath()
  const { user } = useAuth()
  const mutation = useCompleteOnboarding()
  const [username, setUsername] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const finish = async (selectedUsername?: string) => {
    setValidationError(null)
    try {
      await mutation.mutateAsync(selectedUsername)
      navigate(from, { replace: true })
    } catch (error) {
      setValidationError(apiErrorMessage(error, t, 'socialOnboarding.error'))
    }
  }

  const handleContinue = () => {
    const result = usernameSchema.safeParse(username)
    if (!result.success) {
      setValidationError(t('socialOnboarding.invalidUsername'))
      return
    }
    void finish(result.data)
  }

  return (
    <AuthActionLayout
      title={t('socialOnboarding.title')}
      description={t('socialOnboarding.description')}
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-wine-100 bg-wine-50 px-4 py-3 text-sm text-wine-800">
          {t('socialOnboarding.currentUsername', {
            username: user?.username ?? 'vinnoter',
          })}
        </div>

        <Input
          label={t('socialOnboarding.username')}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder={t('socialOnboarding.placeholder')}
          autoComplete="username"
          autoCapitalize="none"
          maxLength={40}
          hint={t('socialOnboarding.hint')}
          error={validationError ?? undefined}
        />

        {mutation.isError && !validationError && (
          <AuthActionMessage
            status="error"
            message={t('socialOnboarding.error')}
          />
        )}

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            size="lg"
            isLoading={mutation.isPending}
            onClick={handleContinue}
            className="w-full"
          >
            {t('socialOnboarding.continue')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={mutation.isPending}
            onClick={() => void finish()}
            className="w-full"
          >
            {t('socialOnboarding.skip')}
          </Button>
        </div>
      </div>
    </AuthActionLayout>
  )
}
