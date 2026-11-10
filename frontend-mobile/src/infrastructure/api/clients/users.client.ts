/**
 * Users API Client.
 * @architecture: Capa 4 — Infraestructura HTTP
 */
import { http } from "@/infrastructure/api/http";
import { resolveApiAssetUrl, resolveUserAssetUrls } from "@/infrastructure/api/resolveApiAssetUrl";
import type {
  ApiResponseDto,
  UserDto,
  UserStatsDto,
  UpdateUserRequestDto,
  CompleteUserOnboardingRequestDto,
  UpdateUserPreferencesRequestDto,
  ChangePasswordRequestDto,
  AvatarUploadFileDto,
  DeleteOwnAccountDto,
  RequestEmailChangeDto,
} from "@/infrastructure/api/dto/users.dto";

export const usersApiClient = {
  getMe: (): Promise<UserDto> =>
    http.get<UserDto>("/auth/me").then((r) => resolveUserAssetUrls(r.data)),

  getMyStats: (): Promise<UserStatsDto> =>
    http
      .get<ApiResponseDto<UserStatsDto>>("/users/me/stats")
      .then((response) => response.data.data),

  updateMe: (data: UpdateUserRequestDto): Promise<UserDto> =>
    http
      .patch<ApiResponseDto<UserDto>>("/users/me", data)
      .then((response) => resolveUserAssetUrls(response.data.data)),

  completeOnboarding: (data: CompleteUserOnboardingRequestDto): Promise<UserDto> =>
    http
      .post<ApiResponseDto<UserDto>>("/users/me/onboarding", data)
      .then((response) => resolveUserAssetUrls(response.data.data)),

  updatePreferences: (data: UpdateUserPreferencesRequestDto): Promise<UserDto> =>
    http
      .patch<ApiResponseDto<UserDto>>("/users/me/preferences", data)
      .then((response) => resolveUserAssetUrls(response.data.data)),

  uploadAvatar: (file: AvatarUploadFileDto): Promise<{ avatarUrl: string }> => {
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.fileName,
      type: file.mimeType,
    } as unknown as Blob);

    return http
      .post<ApiResponseDto<{ avatarUrl: string }>>("/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((response) => ({
        avatarUrl: resolveApiAssetUrl(response.data.data.avatarUrl) ?? response.data.data.avatarUrl,
      }));
  },

  changePassword: (data: ChangePasswordRequestDto): Promise<void> =>
    http.post("/users/me/change-password", data).then(() => undefined),

  deactivateAccount: (): Promise<void> => http.delete("/users/me").then(() => undefined),

  requestEmailChange: (data: RequestEmailChangeDto): Promise<string> =>
    http
      .post<{ message: string }>("/users/me/email-change", data)
      .then((response) => response.data.message),

  deleteAccount: (data: DeleteOwnAccountDto): Promise<void> =>
    http.delete("/users/me/permanent", { data }).then(() => undefined),
};
