import { useId } from 'react'
import { CircleCheck, KeyRound, LockKeyhole, TriangleAlert } from 'lucide-react'
import { Button } from '@components/ui/Button'
import { Icon } from '@components/ui/Icon'
import { fieldClassName, fieldHintClassName, fieldLabelClassName } from '@components/ui/fieldStyles'
import { Card } from '@components/ui/Card'
import type { UserProfileViewModel } from './useUserProfileViewModel'
import { ShieldIcon } from './UserProfileShared'

interface UserProfileTabProps {
  vm: UserProfileViewModel
}

export function UserProfileSecurityTab({ vm }: UserProfileTabProps) {
  const {
    t,
    user,
    showPasswordForm,
    setShowPasswordForm,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    changePasswordMutation,
    handleChangePassword,
    requestPasswordSetupMutation,
    handleRequestPasswordSetup,
  } = vm

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Icon icon={LockKeyhole} size="md" className="text-wine-700" />
          {t('profile.password')}
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          {user?.hasPassword
            ? t('profile.passwordHint')
            : t('profile.socialPasswordHint')}
        </p>

        {!user?.hasPassword ? (
          <Button
            variant="outline"
            isLoading={requestPasswordSetupMutation.isPending}
            onClick={handleRequestPasswordSetup}
          >
            {t('profile.sendPasswordSetupLink')}
          </Button>
        ) : !showPasswordForm ? (
          <Button variant="outline" onClick={() => setShowPasswordForm(true)} leftIcon={<Icon icon={KeyRound} />}>
            {t('profile.changePassword')}
          </Button>
        ) : (
          <div className="max-w-md space-y-4">
            <PasswordField
              label={t('profile.currentPassword')}
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
            />
            <PasswordField label={t('profile.newPassword')} value={newPassword} onChange={setNewPassword} autoComplete="new-password" hint={t('profile.minChars')} />
            <PasswordField label={t('profile.confirmNewPassword')} value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowPasswordForm(false)
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button isLoading={changePasswordMutation.isPending} onClick={handleChangePassword}>
                {t('profile.changePassword')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card padding="lg">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <ShieldIcon className="h-5 w-5 text-wine-700" />
          {t('profile.verificationStatus')}
        </h2>
        <div className={`flex items-center gap-3 rounded-xl p-4 ${user?.isVerified ? 'bg-success-soft' : 'bg-warning-soft'}`}>
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${'bg-white'}`}>
            {user?.isVerified ? (
              <Icon icon={CircleCheck} size="md" className="text-success" />
            ) : (
              <Icon icon={TriangleAlert} size="md" className="text-warning" />
            )}
          </div>
          <div>
            <p className={`font-medium ${user?.isVerified ? 'text-success' : 'text-warning'}`}>{user?.isVerified ? t('profile.emailVerified') : t('profile.verificationPending')}</p>
            <p className={`text-sm ${'text-gray-700'}`}>{user?.isVerified ? t('profile.emailVerifiedDesc') : t('profile.verificationPendingDesc')}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

function PasswordField({ label, value, onChange, autoComplete, hint }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string; hint?: string }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={fieldLabelClassName}>
        {label} <span aria-hidden="true" className="text-danger">*</span>
      </label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} type="password" required autoComplete={autoComplete} aria-describedby={hint ? `${id}-hint` : undefined} className={fieldClassName()} />
      {hint && <p id={`${id}-hint`} className={fieldHintClassName}>{hint}</p>}
    </div>
  )
}
