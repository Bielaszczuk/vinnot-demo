import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usersClient } from '@api/clients/users.client'
import { mapUserFromDto, mapUserProfileFromDto, mapUserStatsFromDto } from '@domain/user/user.mappers'
import { HttpError } from '@infrastructure/http/errors'
import { timezoneGateway } from '@infrastructure/device/timezone.gateway'
import { usersService } from './users.service'

vi.mock('@api/clients/users.client', () => ({
  usersClient: {
    getUsers: vi.fn(), getUser: vi.fn(), getUserProfile: vi.fn(), getUserStats: vi.fn(),
    getMyStats: vi.fn(), updateUser: vi.fn(), completeOnboarding: vi.fn(),
    updatePreferences: vi.fn(), uploadAvatar: vi.fn(), changePassword: vi.fn(),
    deactivateOwnAccount: vi.fn(), requestEmailChange: vi.fn(), deleteOwnAccount: vi.fn(),
  },
}))

vi.mock('@domain/user/user.mappers', () => ({
  mapUserFromDto: vi.fn(), mapUserProfileFromDto: vi.fn(), mapUserStatsFromDto: vi.fn(),
}))

vi.mock('@infrastructure/device/timezone.gateway', () => ({
  timezoneGateway: { current: vi.fn() },
}))

describe('usersService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps user pages and preserves transport pagination', async () => {
    const pagination = { page: 0, size: 20, totalElements: 1, totalPages: 1 }
    vi.mocked(usersClient.getUsers).mockResolvedValue({
      data: [{ id: 'user-1' }], pagination,
    } as never)
    vi.mocked(mapUserFromDto).mockReturnValue({ id: 'user-1' } as never)

    await expect(usersService.getUsers({ page: 0 })).resolves.toEqual({
      users: [{ id: 'user-1' }], pagination,
    })
  })

  it('maps stats and delegates account lifecycle operations', async () => {
    vi.mocked(usersClient.getMyStats).mockResolvedValue({ reviewsCount: 2 } as never)
    vi.mocked(mapUserStatsFromDto).mockReturnValue({ reviewsCount: 2 } as never)

    await expect(usersService.getMyStats()).resolves.toEqual({ reviewsCount: 2 })
    await usersService.changePassword('old', 'NewPassword1')
    await usersService.deactivateAccount()
    await usersService.deleteAccount({ appleAuthorizationCode: 'code' })

    expect(usersClient.changePassword).toHaveBeenCalledWith({
      current_password: 'old', new_password: 'NewPassword1',
    })
    expect(usersClient.deactivateOwnAccount).toHaveBeenCalled()
    expect(usersClient.deleteOwnAccount).toHaveBeenCalledWith({ appleAuthorizationCode: 'code' })
  })

  it('maps user detail, public profile, stats and updates', async () => {
    const dto = { id: 'user-1' } as never
    vi.mocked(usersClient.getUser).mockResolvedValue(dto)
    vi.mocked(usersClient.getUserProfile).mockResolvedValue(dto)
    vi.mocked(usersClient.getUserStats).mockResolvedValue(dto)
    vi.mocked(usersClient.updateUser).mockResolvedValue(dto)
    vi.mocked(usersClient.completeOnboarding).mockResolvedValue(dto)
    vi.mocked(mapUserFromDto).mockReturnValue(dto)
    vi.mocked(mapUserProfileFromDto).mockReturnValue(dto)
    vi.mocked(mapUserStatsFromDto).mockReturnValue(dto)

    await usersService.getUser('user-1')
    await usersService.getUserProfile('user-1')
    await usersService.getUserStats('user-1')
    await usersService.updateUser({ firstName: 'Ana' })
    await usersService.completeOnboarding('ana')

    expect(usersClient.completeOnboarding).toHaveBeenCalledWith({ username: 'ana' })
  })

  it('uploads avatars and requests a verified email change', async () => {
    const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' })
    vi.mocked(usersClient.uploadAvatar).mockResolvedValue({ avatarUrl: 'https://img/avatar.jpg' })
    vi.mocked(usersClient.requestEmailChange).mockResolvedValue('sent')

    await expect(usersService.uploadAvatar(file)).resolves.toBe('https://img/avatar.jpg')
    await expect(usersService.requestEmailChange('new@vinnot.com')).resolves.toBe('sent')
    expect(usersClient.requestEmailChange).toHaveBeenCalledWith({ newEmail: 'new@vinnot.com' })
  })

  describe('deviceTimezone', () => {
    it('returns the browser time zone from the gateway', () => {
      vi.mocked(timezoneGateway.current).mockReturnValue('Europe/Madrid')

      expect(usersService.deviceTimezone()).toBe('Europe/Madrid')
    })
  })

  describe('syncAccountLocale', () => {
    it('sends the account language and the browser time zone', async () => {
      vi.mocked(timezoneGateway.current).mockReturnValue('Europe/Madrid')
      vi.mocked(usersClient.updatePreferences).mockResolvedValue({ id: 'user-1' } as never)

      await usersService.syncAccountLocale('en-US')

      expect(usersClient.updatePreferences).toHaveBeenCalledWith({
        preferredLanguage: 'en', timezone: 'Europe/Madrid',
      })
    })

    it('sends only the language when the browser reports no zone', async () => {
      vi.mocked(timezoneGateway.current).mockReturnValue(undefined)
      vi.mocked(usersClient.updatePreferences).mockResolvedValue({ id: 'user-1' } as never)

      await usersService.syncAccountLocale('es-AR')

      expect(usersClient.updatePreferences).toHaveBeenCalledWith({ preferredLanguage: 'es' })
    })

    it('keeps the language when the server does not recognise the browser zone', async () => {
      vi.mocked(timezoneGateway.current).mockReturnValue('Etc/Unknown')
      vi.mocked(usersClient.updatePreferences)
        .mockRejectedValueOnce(new HttpError(400, 'INVALID_TIMEZONE', 'Invalid'))
        .mockResolvedValueOnce({ id: 'user-1' } as never)

      await usersService.syncAccountLocale('en-US')

      expect(usersClient.updatePreferences).toHaveBeenNthCalledWith(2, { preferredLanguage: 'en' })
    })

    it('propagates other failures without retrying', async () => {
      vi.mocked(timezoneGateway.current).mockReturnValue('Europe/Madrid')
      const offline = new HttpError(0, 'NETWORK_ERROR', 'Offline')
      vi.mocked(usersClient.updatePreferences).mockRejectedValue(offline)

      await expect(usersService.syncAccountLocale('en-US')).rejects.toBe(offline)
      expect(usersClient.updatePreferences).toHaveBeenCalledTimes(1)
    })
  })
})
