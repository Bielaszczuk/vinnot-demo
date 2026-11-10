import { adminAppVersionsClient } from '@api/clients/adminAppVersions.client'
import { isHttpError } from '@infrastructure/http/errors'
import type { AppVersionSettingsDto } from '@api/dto/adminAppVersions.dto'
import {
  APP_PLATFORMS,
  APP_VERSION_ERROR_CODES,
  type AppPlatform,
  type AppVersionErrorCode,
  type AppVersionSettings,
} from '@domain/admin/appVersion'

function oneOf<T extends string>(values: readonly T[], value: string | null | undefined): T | null {
  return values.find((candidate) => candidate === value) ?? null
}

/** Platforms this build does not know are left out instead of guessed at. */
function toSettings(dto: AppVersionSettingsDto): AppVersionSettings {
  return {
    platforms: dto.platforms.flatMap((entry) => {
      const platform = oneOf(APP_PLATFORMS, entry.platform)
      return platform ? [{ ...entry, platform }] : []
    }),
    recentChanges: dto.recentChanges.flatMap((change) => {
      const platform = oneOf(APP_PLATFORMS, change.platform)
      return platform ? [{ ...change, platform }] : []
    }),
  }
}

/** The backend refusal behind a failed change, when the page can explain it. */
export function appVersionErrorCode(error: unknown): AppVersionErrorCode | null {
  return isHttpError(error) ? oneOf(APP_VERSION_ERROR_CODES, error.code) : null
}

export const adminAppVersionsService = {
  async getSettings(): Promise<AppVersionSettings> {
    return toSettings(await adminAppVersionsClient.getSettings())
  },

  /** `null` clears the minimum: no build of that platform is blocked. */
  async setMinimumVersion(platform: AppPlatform, minimumVersion: string | null): Promise<AppVersionSettings> {
    return toSettings(await adminAppVersionsClient.setMinimumVersion(platform, minimumVersion))
  },
}
