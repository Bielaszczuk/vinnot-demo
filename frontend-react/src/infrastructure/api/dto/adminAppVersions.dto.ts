/** Backend contracts of `/admin/app-versions` (#428). */

export interface AppPlatformVersionDto {
  platform: string
  minimumVersion: string | null
  updatedAt: string | null
  updatedBy: string | null
}

export interface AppVersionChangeDto {
  platform: string
  previousMinimumVersion: string | null
  minimumVersion: string | null
  changedBy: string
  changedAt: string
}

export interface AppVersionSettingsDto {
  platforms: AppPlatformVersionDto[]
  recentChanges: AppVersionChangeDto[]
}
