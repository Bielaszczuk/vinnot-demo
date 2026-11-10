import http from '@infrastructure/http/http'
import type { ApiResponse } from '@api/api.types'
import type { AppVersionSettingsDto } from '@api/dto/adminAppVersions.dto'

const APP_VERSIONS = '/admin/app-versions'

/**
 * Admin app versions API (#428). Changing a minimum needs a fresh reauthentication: the HTTP client asks for it and
 * retries on its own.
 */
export const adminAppVersionsClient = {
  async getSettings(): Promise<AppVersionSettingsDto> {
    return (await http.get<ApiResponse<AppVersionSettingsDto>>(APP_VERSIONS)).data.data
  },

  async setMinimumVersion(platform: string, minimumVersion: string | null): Promise<AppVersionSettingsDto> {
    return (await http.put<ApiResponse<AppVersionSettingsDto>>(`${APP_VERSIONS}/${encodeURIComponent(platform)}`,
      { minimumVersion })).data.data
  },
}
