import http from '@infrastructure/http/http'
import { resolveApiAssetUrl } from '@infrastructure/http/resolveApiAssetUrl'
import { API_ENDPOINTS } from '@config/constants'
import type { ApiResponse, PaginatedResponse } from '@api/api.types'
import type {
  UserDto,
  UserProfileDto,
  UserStatsDto,
  UpdateUserRequestDto,
  UpdateUserPreferencesRequestDto,
  ChangePasswordRequestDto,
  CompleteUserOnboardingRequestDto,
  DeleteOwnAccountDto,
  RequestEmailChangeDto,
  UserFilterParamsDto,
  UserPointsDto,
  PointsAcknowledgementRequestDto,
} from '@api/dto/users.dto'
import type { PublicCellarWineDto, SocialPageDto, UserReviewDto } from '@api/dto/social.dto'
import { normalizeUserReview, toSocialPage, withWineImage } from './socialTransport'

/**
 * Users API client
 */
export const usersClient = {
  /**
   * Get paginated list of users (admin only)
   */
  async getUsers(params?: UserFilterParamsDto): Promise<PaginatedResponse<UserDto>> {
    const response = await http.get<PaginatedResponse<UserDto>>(API_ENDPOINTS.USERS, {
      params,
    })
    return {
      ...response.data,
      data: response.data.data.map(normalizeUserDto),
    }
  },

  /**
   * Get a user by ID
   */
  async getUser(id: string): Promise<UserDto> {
    const response = await http.get<ApiResponse<UserDto>>(`${API_ENDPOINTS.USERS}/${id}`)
    return normalizeUserDto(response.data.data)
  },

  /**
   * Get user public profile
   */
  async getUserProfile(id: string): Promise<UserProfileDto> {
    const response = await http.get<ApiResponse<UserProfileDto>>(
      `${API_ENDPOINTS.USERS}/${encodeURIComponent(id)}/profile`
    )
    return normalizeUserProfileDto(response.data.data)
  },

  /**
   * Approved reviews of a user, newest first
   */
  async getUserReviews(id: string, page: number, size: number): Promise<SocialPageDto<UserReviewDto>> {
    const response = await http.get<unknown>(`${API_ENDPOINTS.USERS}/${encodeURIComponent(id)}/reviews`, {
      params: { page, size },
    })
    return toSocialPage<UserReviewDto>(response.data, normalizeUserReview)
  },

  /**
   * Public cellar of a user; 403 CELLAR_NOT_VISIBLE when the owner hides it from the viewer
   */
  async getUserCellar(id: string, page: number, size: number): Promise<SocialPageDto<PublicCellarWineDto>> {
    const response = await http.get<unknown>(`${API_ENDPOINTS.USERS}/${encodeURIComponent(id)}/cellar`, {
      params: { page, size },
    })
    return toSocialPage<PublicCellarWineDto>(response.data, withWineImage)
  },

  /**
   * Get user stats
   */
  async getUserStats(id: string): Promise<UserStatsDto> {
    const response = await http.get<ApiResponse<UserStatsDto>>(
      `${API_ENDPOINTS.USERS}/${id}/stats`
    )
    return response.data.data
  },

  /**
   * Get current user stats
   */
  async getMyStats(): Promise<UserStatsDto> {
    const response = await http.get<ApiResponse<UserStatsDto>>(
      `${API_ENDPOINTS.USERS}/me/stats`
    )
    return response.data.data
  },

  /**
   * Current user points, wax-seal tier and recent movements
   */
  async getMyPoints(): Promise<UserPointsDto> {
    const response = await http.get<ApiResponse<UserPointsDto> | UserPointsDto>(
      `${API_ENDPOINTS.USERS}/me/points`
    )
    return unwrapPoints(response.data)
  },

  /**
   * Mark a tier celebrated or dismiss the one-time welcome card (204)
   */
  async acknowledgePoints(data: PointsAcknowledgementRequestDto): Promise<void> {
    await http.post(`${API_ENDPOINTS.USERS}/me/points/celebrations`, data)
  },

  /**
   * Update current user
   */
  async updateUser(data: UpdateUserRequestDto): Promise<UserDto> {
    const response = await http.patch<ApiResponse<UserDto>>(
      `${API_ENDPOINTS.USERS}/me`,
      data
    )
    return normalizeUserDto(response.data.data)
  },

  /**
   * Complete the lightweight setup required after the first social login.
   * Omitting username keeps the generated identity assigned by the backend.
   */
  async completeOnboarding(data: CompleteUserOnboardingRequestDto): Promise<UserDto> {
    const response = await http.post<ApiResponse<UserDto>>(
      `${API_ENDPOINTS.USERS}/me/onboarding`,
      data,
    )
    return normalizeUserDto(response.data.data)
  },

  /**
   * Update user preferences
   */
  async updatePreferences(data: UpdateUserPreferencesRequestDto): Promise<UserDto> {
    const response = await http.patch<ApiResponse<UserDto>>(
      `${API_ENDPOINTS.USERS}/me/preferences`,
      data
    )
    return normalizeUserDto(response.data.data)
  },

  /**
   * Upload user avatar image
   */
  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await http.post<ApiResponse<{ avatarUrl: string }>>(
      `${API_ENDPOINTS.USERS}/me/avatar`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return {
      avatarUrl: resolveApiAssetUrl(response.data.data.avatarUrl) ?? '',
    }
  },

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordRequestDto): Promise<void> {
    await http.post(`${API_ENDPOINTS.USERS}/me/change-password`, data)
  },

  /**
   * Soft-deactivate the current user account
   */
  async deactivateOwnAccount(): Promise<void> {
    await http.delete(`${API_ENDPOINTS.USERS}/me`)
  },

  async requestEmailChange(data: RequestEmailChangeDto): Promise<string> {
    const response = await http.post<{ message: string }>(
      `${API_ENDPOINTS.USERS}/me/email-change`,
      data,
    )
    return response.data.message
  },

  async deleteOwnAccount(data: DeleteOwnAccountDto): Promise<void> {
    await http.delete(`${API_ENDPOINTS.USERS}/me/permanent`, { data })
  },
}

/** The other `/users/me` endpoints wrap their body in `data`; accept both shapes. */
function unwrapPoints(body: ApiResponse<UserPointsDto> | UserPointsDto): UserPointsDto {
  return 'data' in body ? body.data : body
}

function normalizeUserDto(user: UserDto): UserDto {
  return {
    ...user,
    avatarUrl: resolveApiAssetUrl(user.avatarUrl),
    avatar: resolveApiAssetUrl(user.avatar),
  }
}

function normalizeUserProfileDto(user: UserProfileDto): UserProfileDto {
  return {
    ...user,
    avatarUrl: resolveApiAssetUrl(user.avatarUrl),
  }
}

export default usersClient
