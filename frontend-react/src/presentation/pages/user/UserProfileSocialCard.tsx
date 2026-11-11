import { Check, Eye, Globe2 } from 'lucide-react'
import { Button } from '@components/ui/Button'
import { Card } from '@components/ui/Card'
import { Icon } from '@components/ui/Icon'
import { LinkButton } from '@components/ui/LinkButton'
import { Select } from '@components/ui/Select'
import { Textarea } from '@components/ui/Textarea'
import { CELLAR_VISIBILITIES, type CellarVisibility } from '@domain/social/social.types'
import { useSocialProfileEditor } from './useSocialProfileEditor'

/** "Public profile" card of /profile: the bio others see and who can see the cellar. */
export function UserProfileSocialCard() {
  const vm = useSocialProfileEditor()
  const { t } = vm

  return (
    <Card padding="lg" className="mt-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Icon icon={Globe2} size="md" className="text-wine-700" />
            {t('social.publicProfile.title')}
          </h2>
          <p className="mt-1 text-sm text-gray-500">{t('social.publicProfile.subtitle')}</p>
        </div>
        {vm.userId && (
          <LinkButton to={`/users/${vm.userId}`} variant="ghost" size="sm" leftIcon={<Icon icon={Eye} size="sm" />}>
            {t('social.publicProfile.view')}
          </LinkButton>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <Textarea
            id="profile-bio"
            label={t('social.publicProfile.bio')}
            placeholder={t('social.publicProfile.bioPlaceholder')}
            value={vm.bio}
            maxLength={vm.bioMax}
            rows={3}
            onChange={(event) => vm.setBio(event.target.value)}
          />
          <p className="mt-1 text-right text-xs tabular-nums text-gray-500" aria-live="polite">
            {t('social.publicProfile.bioCounter', { count: vm.bio.length, max: vm.bioMax })}
          </p>
        </div>

        <Select
          id="profile-cellar-visibility"
          label={t('social.publicProfile.cellarVisibility')}
          hint={t('social.publicProfile.cellarVisibilityHint')}
          value={vm.cellarVisibility}
          options={vm.visibilityOptions}
          onChange={(event) => {
            const value = event.target.value as CellarVisibility
            if (CELLAR_VISIBILITIES.includes(value)) vm.setCellarVisibility(value)
          }}
        />

        <div className="flex justify-end pt-2">
          <Button isLoading={vm.saving} onClick={vm.save} leftIcon={<Icon icon={Check} />}>
            {t('social.publicProfile.save')}
          </Button>
        </div>
      </div>
    </Card>
  )
}
