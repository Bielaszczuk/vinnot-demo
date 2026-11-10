/**
 * Minimum app version per platform (#428): mobile builds older than the minimum of their platform are blocked behind
 * an update-required screen. A `null` minimum blocks nothing.
 */

export const APP_PLATFORMS = ['IOS', 'ANDROID'] as const
export type AppPlatform = (typeof APP_PLATFORMS)[number]

/** Refusals of the admin API the page can explain. */
export const APP_VERSION_ERROR_CODES = ['INVALID_APP_VERSION', 'NOT_AN_APP_PLATFORM'] as const
export type AppVersionErrorCode = (typeof APP_VERSION_ERROR_CODES)[number]

export interface AppPlatformVersion {
  platform: AppPlatform
  minimumVersion: string | null
  updatedAt: string | null
  /** Email of the administrator who changed it last. */
  updatedBy: string | null
}

export interface AppVersionChange {
  platform: AppPlatform
  previousMinimumVersion: string | null
  minimumVersion: string | null
  changedBy: string
  changedAt: string
}

export interface AppVersionSettings {
  platforms: AppPlatformVersion[]
  /** Latest changes first. */
  recentChanges: AppVersionChange[]
}
