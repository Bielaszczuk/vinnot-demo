import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@hooks/useToast'
import { useAppVersionSettings, useSetMinimumAppVersion } from '@hooks/queries/admin'
import { appVersionErrorCode } from '@services/adminAppVersions.service'
import type { AppPlatform } from '@domain/admin/appVersion'
import { compareAppVersions, readMinimumVersion } from '@domain/admin/appVersion.validators'

export interface PendingRaise {
  platform: AppPlatform
  from: string | null
  to: string
}

/**
 * Minimum app version per platform (#428). Raising a minimum asks first, because every older build of that platform
 * is blocked at once; lowering or clearing it applies directly. Every change asks for a fresh reauthentication.
 */
export function useAdminAppVersionsViewModel() {
  const { t, i18n } = useTranslation()
  const { addToast } = useToast()
  const settings = useAppVersionSettings()
  const mutation = useSetMinimumAppVersion()
  const [drafts, setDrafts] = useState<Partial<Record<AppPlatform, string>>>({})
  const [invalid, setInvalid] = useState<Partial<Record<AppPlatform, boolean>>>({})
  const [pendingRaise, setPendingRaise] = useState<PendingRaise | null>(null)
  const locale = i18n.resolvedLanguage ?? i18n.language

  const currentOf = useCallback((platform: AppPlatform) =>
    settings.data?.platforms.find((entry) => entry.platform === platform)?.minimumVersion ?? null, [settings.data])

  const draftOf = (platform: AppPlatform) => drafts[platform] ?? currentOf(platform) ?? ''

  const platformLabel = useCallback((platform: AppPlatform) => t(`admin.appVersions.platforms.${platform}`), [t])

  const formatDate = useCallback((value: string) =>
    new Date(value).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }), [locale])

  const edit = (platform: AppPlatform, value: string) => {
    setDrafts((previous) => ({ ...previous, [platform]: value }))
    setInvalid((previous) => ({ ...previous, [platform]: false }))
  }

  const apply = useCallback(async (platform: AppPlatform, minimumVersion: string | null) => {
    try {
      await mutation.mutateAsync({ platform, minimumVersion })
      setDrafts((previous) => ({ ...previous, [platform]: undefined }))
      addToast({
        type: 'success',
        message: minimumVersion === null
          ? t('admin.appVersions.cleared', { platform: platformLabel(platform) })
          : t('admin.appVersions.saved', { platform: platformLabel(platform), version: minimumVersion }),
      })
    } catch (error) {
      addToast({ type: 'error', message: t(`admin.appVersions.errors.${appVersionErrorCode(error) ?? 'generic'}`) })
    } finally {
      setPendingRaise(null)
    }
  }, [addToast, mutation, platformLabel, t])

  /** Saves the typed value; raising the minimum waits for the confirmation. */
  const save = (platform: AppPlatform) => {
    const input = readMinimumVersion(draftOf(platform))
    if (!input.ok) {
      setInvalid((previous) => ({ ...previous, [platform]: true }))
      return
    }
    const current = currentOf(platform)
    if (input.value === current) return
    if (input.value !== null && (current === null || compareAppVersions(input.value, current) > 0)) {
      setPendingRaise({ platform, from: current, to: input.value })
      return
    }
    void apply(platform, input.value)
  }

  /** Removes the minimum of a platform: no build of it is blocked. */
  const clear = (platform: AppPlatform) => {
    setInvalid((previous) => ({ ...previous, [platform]: false }))
    void apply(platform, null)
  }

  return {
    t,
    settings,
    draftOf,
    edit,
    invalid: (platform: AppPlatform) => invalid[platform] === true,
    changed: (platform: AppPlatform) => draftOf(platform).trim() !== (currentOf(platform) ?? ''),
    save,
    clear,
    saving: mutation.isPending ? mutation.variables?.platform ?? null : null,
    platformLabel,
    formatDate,
    pendingRaise,
    cancelRaise: () => setPendingRaise(null),
    confirmRaise: () => (pendingRaise ? apply(pendingRaise.platform, pendingRaise.to) : Promise.resolve()),
  }
}
