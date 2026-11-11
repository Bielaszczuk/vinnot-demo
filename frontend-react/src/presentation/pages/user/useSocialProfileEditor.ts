import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@hooks/useToast'
import { useUpdateSocialProfile } from '@hooks/queries/social/useUpdateSocialProfile'
import { CELLAR_VISIBILITIES, type CellarVisibility } from '@domain/social/social.types'
import { BIO_MAX_LENGTH } from '@domain/social/social.validators'

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : undefined
}

/** Edits the own public bio (max 160, with counter) and who can see the cellar. */
export function useSocialProfileEditor() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { addToast } = useToast()
  const mutation = useUpdateSocialProfile()
  const [bio, setBio] = useState(() => user?.bio ?? '')
  const [cellarVisibility, setCellarVisibility] = useState<CellarVisibility>(() => user?.cellarVisibility ?? 'PUBLIC')

  const save = useCallback(async () => {
    try {
      await mutation.mutateAsync({ bio, cellarVisibility })
      addToast({ type: 'success', message: t('social.publicProfile.saved') })
    } catch (error) {
      addToast({
        type: 'error',
        message: errorCode(error) === 'BIO_TOO_LONG'
          ? t('social.publicProfile.bioTooLong', { max: BIO_MAX_LENGTH })
          : t('social.publicProfile.saveError'),
      })
    }
  }, [mutation, bio, cellarVisibility, addToast, t])

  return {
    t,
    userId: user?.id,
    bio,
    setBio,
    bioMax: BIO_MAX_LENGTH,
    cellarVisibility,
    setCellarVisibility,
    visibilityOptions: CELLAR_VISIBILITIES.map((value) => ({ value, label: t(`social.publicProfile.visibility.${value}`) })),
    saving: mutation.isPending,
    save,
  }
}
