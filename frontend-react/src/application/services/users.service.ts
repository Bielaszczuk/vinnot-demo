import { usersClient } from '@api/clients/users.client'
import { mapPublicCellarWine, mapSocialPage, mapSocialReview } from '@domain/social/social.mappers'
import { normalizeBio } from '@domain/social/social.validators'
import type { CellarVisibility, PublicCellar, SocialPage, SocialReview } from '@domain/social/social.types'
import { mapUserFromDto, mapUserProfileFromDto, mapUserStatsFromDto } from '@domain/user/user.mappers'
import { toPreferredLanguage } from '@domain/user/accountLocale'
import type { User, UserProfile, UserStats } from '@domain/user/user.types'
import type { PaginationMeta } from '@api/api.types'
import type { UserFilterParamsDto } from '@api/dto/users.dto'
import { timezoneGateway } from '@infrastructure/device/timezone.gateway'
import { isHttpError } from '@infrastructure/http/errors'

export interface UsersResult {
  users: User[]
  pagination: PaginationMeta
}

export interface UpdateUserInput {
  phoneNumber?: string
  username?: string
  firstName?: string
  lastName?: string
  name?: string
}

export interface SocialProfileInput {
  bio: string
  cellarVisibility: CellarVisibility
}

const PROFILE_REVIEWS_PAGE_SIZE = 10
const PROFILE_CELLAR_PAGE_SIZE = 12

export interface DeleteAccountInput {
  appleAuthorizationCode?: string
  appleClientId?: string
  appleRedirectUri?: string
}

/**
 * Users service
 */
export const usersService = {
  /**
   * Get paginated list of users (admin only)
   */
  async getUsers(params?: UserFilterParamsDto): Promise<UsersResult> {
    const response = await usersClient.getUsers(params)

    return {
      users: response.data.map(mapUserFromDto),
      pagination: response.pagination,
    }
  },

  /**
   * Get a user by ID
   */
  async getUser(id: string): Promise<User> {
    const response = await usersClient.getUser(id)
    return mapUserFromDto(response)
  },

  /**
   * Get user public profile
   */
  async getUserProfile(id: string): Promise<UserProfile> {
    const response = await usersClient.getUserProfile(id)
    return mapUserProfileFromDto(response)
  },

  /**
   * Approved reviews of a user's public profile, newest first
   */
  async getUserReviews(id: string, page: number): Promise<SocialPage<SocialReview>> {
    return mapSocialPage(await usersClient.getUserReviews(id, page, PROFILE_REVIEWS_PAGE_SIZE), mapSocialReview)
  },

  /**
   * Public cellar of a user, or the locked state when its owner hides it from the viewer
   */
  async getUserCellar(id: string, page: number): Promise<PublicCellar> {
    try {
      const cellar = await usersClient.getUserCellar(id, page, PROFILE_CELLAR_PAGE_SIZE)
      return { visible: true, page: mapSocialPage(cellar, mapPublicCellarWine) }
    } catch (error: unknown) {
      if (isHttpError(error) && error.status === 403 && error.code === 'CELLAR_NOT_VISIBLE') return { visible: false }
      throw error
    }
  },

  /**
   * Saves the public bio and who can see the cellar (PATCH /users/me)
   */
  async updateSocialProfile(input: SocialProfileInput): Promise<User> {
    const response = await usersClient.updateUser({
      bio: normalizeBio(input.bio),
      cellarVisibility: input.cellarVisibility,
    })
    return mapUserFromDto(response)
  },

  /**
   * Get user stats
   */
  async getUserStats(id: string): Promise<UserStats> {
    const response = await usersClient.getUserStats(id)
    return mapUserStatsFromDto(response)
  },

  /**
   * Get current user stats
   */
  async getMyStats(): Promise<UserStats> {
    const response = await usersClient.getMyStats()
    return mapUserStatsFromDto(response)
  },

  /**
   * Update current user
   */
  async updateUser(input: UpdateUserInput): Promise<User> {
    const response = await usersClient.updateUser(input)
    return mapUserFromDto(response)
  },

  /**
   * Complete first-access social onboarding.
   * An omitted username explicitly means that the generated username is accepted.
   */
  async completeOnboarding(username?: string): Promise<User> {
    const response = await usersClient.completeOnboarding({ username })
    return mapUserFromDto(response)
  },

  /** Current device time zone (IANA id), used to detect changes worth syncing. */
  deviceTimezone(): string | undefined {
    return timezoneGateway.current()
  },

  /**
   * Stores the interface language and the browser time zone on the account,
   * so notifications reach the user in their language and local time.
   */
  async syncAccountLocale(uiLanguage: string): Promise<void> {
    const preferredLanguage = toPreferredLanguage(uiLanguage)
    const timezone = timezoneGateway.current()
    try {
      await usersClient.updatePreferences(timezone ? { preferredLanguage, timezone } : { preferredLanguage })
    } catch (error: unknown) {
      // A browser may report a zone the server's tz database does not know; keep the language.
      if (!timezone || !isHttpError(error) || error.code !== 'INVALID_TIMEZONE') throw error
      await usersClient.updatePreferences({ preferredLanguage })
    }
  },

  /**
   * Upload avatar image
   */
  async uploadAvatar(file: File): Promise<string> {
    const result = await usersClient.uploadAvatar(file)
    return result.avatarUrl
  },

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await usersClient.changePassword({
      current_password: currentPassword,
      new_password: newPassword,
    })
  },

  /**
   * Soft-deactivate the current user account
   */
  async deactivateAccount(): Promise<void> {
    await usersClient.deactivateOwnAccount()
  },

  async requestEmailChange(newEmail: string): Promise<string> {
    return usersClient.requestEmailChange({ newEmail })
  },

  async deleteAccount(input: DeleteAccountInput = {}): Promise<void> {
    await usersClient.deleteOwnAccount(input)
  },
}

export default usersService
