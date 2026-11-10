import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@infrastructure/http/errors'
import { adminAppVersionsService, appVersionErrorCode } from './adminAppVersions.service'

const client = vi.hoisted(() => ({ getSettings: vi.fn(), setMinimumVersion: vi.fn() }))
vi.mock('@/infrastructure/api/clients/adminAppVersions.client', () => ({ adminAppVersionsClient: client }))

const dto = {
  platforms: [
    { platform: 'IOS', minimumVersion: '0.3.0', updatedAt: '2026-10-25T12:00:00Z', updatedBy: 'admin@vinnot.test' },
    { platform: 'ANDROID', minimumVersion: null, updatedAt: null, updatedBy: null },
    { platform: 'WEB', minimumVersion: '1.0.0', updatedAt: null, updatedBy: null },
  ],
  recentChanges: [
    { platform: 'IOS', previousMinimumVersion: null, minimumVersion: '0.3.0', changedBy: 'admin@vinnot.test', changedAt: '2026-10-25T12:00:00Z' },
    { platform: 'WEB', previousMinimumVersion: null, minimumVersion: '1.0.0', changedBy: 'admin@vinnot.test', changedAt: '2026-10-24T12:00:00Z' },
  ],
}

const settings = {
  platforms: [
    { platform: 'IOS', minimumVersion: '0.3.0', updatedAt: '2026-10-25T12:00:00Z', updatedBy: 'admin@vinnot.test' },
    { platform: 'ANDROID', minimumVersion: null, updatedAt: null, updatedBy: null },
  ],
  recentChanges: [
    { platform: 'IOS', previousMinimumVersion: null, minimumVersion: '0.3.0', changedBy: 'admin@vinnot.test', changedAt: '2026-10-25T12:00:00Z' },
  ],
}

describe('admin app versions service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps the settings and leaves out platforms this build does not know', async () => {
    client.getSettings.mockResolvedValue(dto)
    await expect(adminAppVersionsService.getSettings()).resolves.toEqual(settings)
  })

  it('sets or clears the minimum of one platform', async () => {
    client.setMinimumVersion.mockResolvedValue(dto)

    await expect(adminAppVersionsService.setMinimumVersion('IOS', '0.3.0')).resolves.toEqual(settings)
    await adminAppVersionsService.setMinimumVersion('ANDROID', null)

    expect(client.setMinimumVersion).toHaveBeenNthCalledWith(1, 'IOS', '0.3.0')
    expect(client.setMinimumVersion).toHaveBeenNthCalledWith(2, 'ANDROID', null)
  })

  it('reads the refusals the page can explain', () => {
    expect(appVersionErrorCode(new HttpError(400, 'INVALID_APP_VERSION', 'bad'))).toBe('INVALID_APP_VERSION')
    expect(appVersionErrorCode(new HttpError(400, 'NOT_AN_APP_PLATFORM', 'bad'))).toBe('NOT_AN_APP_PLATFORM')
    expect(appVersionErrorCode(new HttpError(400, 'OTHER', 'bad'))).toBeNull()
    expect(appVersionErrorCode(new Error('offline'))).toBeNull()
  })
})
