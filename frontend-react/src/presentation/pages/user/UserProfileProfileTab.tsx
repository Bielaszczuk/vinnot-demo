import { Check, ImageUp } from 'lucide-react'
import { Button } from '@components/ui/Button'
import { Icon } from '@components/ui/Icon'
import { Input } from '@components/ui/Input'
import { Card } from '@components/ui/Card'
import type { UserProfileViewModel } from './useUserProfileViewModel'
import { UserIcon } from './UserProfileShared'

interface UserProfileTabProps {
  vm: UserProfileViewModel
}

export function UserProfileProfileTab({ vm }: UserProfileTabProps) {
  const {
    t,
    user,
    profileUsername,
    setProfileUsername,
    profileFirstName,
    setProfileFirstName,
    profileLastName,
    setProfileLastName,
    profilePhone,
    setProfilePhone,
    updateProfileMutation,
    triggerFileInput,
    handleSaveProfile,
  } = vm

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <UserIcon className="h-5 w-5 text-wine-700" />
          {t('profile.personalInfo')}
        </h2>

        <div className="space-y-5">
          <Input
            id="profile-username"
            label={t('profile.username')}
            hint={t('profile.usernameHint')}
            value={profileUsername}
            onChange={(event) => setProfileUsername(event.target.value)}
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            maxLength={40}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="profile-first-name"
              label={`${t('profile.firstName')} *`}
              value={profileFirstName}
              onChange={(event) => setProfileFirstName(event.target.value)}
              type="text"
              required
              maxLength={100}
              autoComplete="given-name"
              placeholder={t('profile.firstNamePlaceholder')}
            />
            <Input
              id="profile-last-name"
              label={t('profile.lastName')}
              value={profileLastName}
              onChange={(event) => setProfileLastName(event.target.value)}
              type="text"
              maxLength={100}
              autoComplete="family-name"
              placeholder={t('profile.lastNamePlaceholder')}
            />
          </div>

          <Input
            id="profile-phone"
            label={t('contactPhone.optionalLabel')}
            hint={t('contactPhone.privateHint')}
            type="tel"
            autoComplete="tel"
            maxLength={50}
            value={profilePhone}
            onChange={(event) => setProfilePhone(event.target.value)}
            placeholder="+54 9 11 2345 6789"
          />
          <Input
            id="profile-email"
            label={t('profile.email')}
            hint={t('profile.emailChangePolicy')}
            value={user?.email || ''}
            type="email"
            disabled
          />

          <div>
            <p className="mb-1.5 block text-sm font-medium text-gray-700">{t('profile.avatar')}</p>
            <Button variant="secondary" onClick={triggerFileInput} leftIcon={<Icon icon={ImageUp} />}>
              {t('profile.upload')}
            </Button>
            <p className="mt-1 text-xs text-gray-500">{t('profile.avatarHint')}</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button isLoading={updateProfileMutation.isPending} onClick={handleSaveProfile} leftIcon={<Icon icon={Check} />}>
              {t('profile.saveChanges')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
