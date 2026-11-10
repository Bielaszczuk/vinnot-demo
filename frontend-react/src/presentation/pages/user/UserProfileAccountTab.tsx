import { BadgeCheck, Info, Power, TriangleAlert } from 'lucide-react'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { Card } from '@components/ui/Card'
import { Input } from '@components/ui/Input'
import type { UserProfileViewModel } from './useUserProfileViewModel'
import { formatProfileDate } from './UserProfileFormatters'

interface UserProfileTabProps {
  vm: UserProfileViewModel
}

export function UserProfileAccountTab({ vm }: UserProfileTabProps) {
  const {
    t,
    user,
    deactivateAccountMutation,
    deleteAccountMutation,
    requestEmailChangeMutation,
    newEmail,
    setNewEmail,
    handleDeactivateAccount,
    handleDeleteAccount,
    handleRequestEmailChange,
  } = vm

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Icon icon={Info} size="md" className="text-wine-700" />
          {t('profile.accountInfo')}
        </h2>

        <div className="divide-y divide-border">
          <AccountRow label={t('profile.user')} value={`@${user?.username}`} />
          <AccountRow label={t('profile.email')} value={user?.email} />
          <div className="flex justify-between py-3">
            <span className="text-sm text-gray-500">{t('profile.roles')}</span>
            <div className="flex gap-1.5">
              {(user?.roles || []).map((role) => (
                <span key={role} className="rounded-full bg-wine-100 px-2 py-0.5 text-xs font-medium text-wine-700">
                  {role.replace('ROLE_', '')}
                </span>
              ))}
            </div>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-sm text-gray-500">{t('profile.accountVerified')}</span>
            <span className={`text-sm font-medium ${user?.isVerified ? 'text-success' : 'text-warning'}`}>
              {user?.isVerified && <BadgeCheck className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />}{user?.isVerified ? t('profile.verified') : t('profile.pending')}
            </span>
          </div>
          <AccountRow label={t('profile.memberSinceLabel')} value={formatProfileDate(user?.createdAt)} />
        </div>
      </Card>

      <Card padding="lg">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          {t('profile.changeEmail')}
        </h2>
        <p className="mb-4 text-sm text-gray-600">{t('profile.emailChangePolicy')}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              type="email"
              label={t('profile.newEmail')}
              value={newEmail}
              placeholder={t('profile.newEmailPlaceholder')}
              onChange={(event) => setNewEmail(event.target.value)}
            />
          </div>
          <Button
            isLoading={requestEmailChangeMutation.isPending}
            disabled={!newEmail.trim()}
            onClick={handleRequestEmailChange}
          >
            {t('profile.sendEmailConfirmation')}
          </Button>
        </div>
      </Card>

      <Card padding="lg" className="border-danger/25 bg-danger-soft">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-danger">
          <Icon icon={TriangleAlert} size="md" className="text-danger" />
          {t('profile.dangerZone')}
        </h2>
        <p className="mb-4 text-sm text-gray-700">{t('profile.dangerZoneDesc')}</p>
        <Button
          variant="danger"
          isLoading={deactivateAccountMutation.isPending}
          onClick={handleDeactivateAccount}
          leftIcon={<Icon icon={Power} />}
        >
          {t('profile.deactivateAccount')}
        </Button>
        <div className="mt-5 border-t border-danger/20 pt-5">
          <p className="mb-3 text-sm font-medium text-gray-800">
            {t('profile.deleteAccountDesc')}
          </p>
          <Button
            variant="danger"
            isLoading={deleteAccountMutation.isPending}
            onClick={handleDeleteAccount}
          >
            {t('profile.deleteAccount')}
          </Button>
        </div>
      </Card>
    </div>
  )
}

function AccountRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex justify-between py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}
