/**
 * Users Service.
 * @architecture: Capa 3 — Aplicación
 */
import { usersApiClient } from "@/infrastructure/api/clients/users.client";
import { mapUserFromDto, mapUserStatsFromDto } from "@/domain/user/user.mappers";
import type { User, UserStats } from "@/domain/user/user.types";
import type { CellarVisibility } from "@/domain/social/social.types";
import type { UpdateUserRequestDto } from "@/infrastructure/api/dto/users.dto";
import { isApiError } from "@/infrastructure/api/errors";
import { timezoneGateway } from "@/infrastructure/device/timezone.gateway";
import { resolveAccountLanguage } from "@/shared/i18n/language";

export interface UpdateProfileInput {
  phoneNumber?: string;
  username?: string;
  firstName: string;
  lastName?: string;
  /** Public bio; blank clears it. */
  bio?: string;
  cellarVisibility?: CellarVisibility;
}

export interface DeleteAccountInput {
  appleAuthorizationCode?: string;
  appleClientId?: string;
  appleRedirectUri?: string;
}

export interface AvatarUploadInput {
  uri: string;
  fileName: string;
  mimeType: string;
}

export const usersService = {
  async getMyStats(): Promise<UserStats> {
    const dto = await usersApiClient.getMyStats();
    return mapUserStatsFromDto(dto);
  },

  async updateMe(data: UpdateProfileInput): Promise<User> {
    return mapUserFromDto(await usersApiClient.updateMe(toUpdateUserRequest(data)));
  },

  async completeOnboarding(username?: string): Promise<User> {
    return mapUserFromDto(
      await usersApiClient.completeOnboarding(username ? { username } : {}),
    );
  },

  /** Current device time zone (IANA id), used to detect changes worth syncing. */
  deviceTimezone(): string | undefined {
    return timezoneGateway.current();
  },

  /**
   * Stores the UI language and the device time zone on the account,
   * so notifications reach the user in their language and local time.
   */
  async syncAccountLocale(uiLanguage: string): Promise<void> {
    const preferredLanguage = resolveAccountLanguage(uiLanguage);
    const timezone = timezoneGateway.current();
    try {
      await usersApiClient.updatePreferences(timezone ? { preferredLanguage, timezone } : { preferredLanguage });
    } catch (error: unknown) {
      // A device may report a zone the server's tz database does not know; keep the language.
      if (!timezone || !isApiError(error) || error.code !== "INVALID_TIMEZONE") throw error;
      await usersApiClient.updatePreferences({ preferredLanguage });
    }
  },

  async uploadAvatar(file: AvatarUploadInput): Promise<string> {
    const result = await usersApiClient.uploadAvatar(file);
    return result.avatarUrl;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await usersApiClient.changePassword({
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  async deactivateAccount(): Promise<void> {
    await usersApiClient.deactivateAccount();
  },

  async requestEmailChange(newEmail: string): Promise<string> {
    return usersApiClient.requestEmailChange({ newEmail });
  },

  async deleteAccount(input: DeleteAccountInput = {}): Promise<void> {
    await usersApiClient.deleteAccount(input);
  },
};

function toUpdateUserRequest(data: UpdateProfileInput): UpdateUserRequestDto {
  return {
    username: data.username,
    firstName: data.firstName,
    ...(data.phoneNumber !== undefined ? { phoneNumber: data.phoneNumber } : {}),
    lastName: data.lastName,
    ...(data.bio !== undefined ? { bio: data.bio } : {}),
    ...(data.cellarVisibility !== undefined ? { cellarVisibility: data.cellarVisibility } : {}),
  };
}
