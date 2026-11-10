import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { usersApiClient } from "@/infrastructure/api/clients/users.client";
import { ApiError, NetworkError } from "@/infrastructure/api/errors";
import { timezoneGateway } from "@/infrastructure/device/timezone.gateway";
import { usersService } from "./users.service";

jest.mock("@/infrastructure/api/clients/users.client", () => ({
  usersApiClient: {
    getMyStats: jest.fn(),
    updateMe: jest.fn(),
    completeOnboarding: jest.fn(),
    uploadAvatar: jest.fn(),
    changePassword: jest.fn(),
    deactivateAccount: jest.fn(),
    requestEmailChange: jest.fn(),
    deleteAccount: jest.fn(),
    updatePreferences: jest.fn(),
  },
}));

jest.mock("@/infrastructure/device/timezone.gateway", () => ({
  timezoneGateway: { current: jest.fn() },
}));

const currentZone = timezoneGateway.current as jest.MockedFunction<typeof timezoneGateway.current>;

const usersApiClientMock = usersApiClient as jest.Mocked<typeof usersApiClient>;

describe("users.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sends separated profile names without presentation-only fields", async () => {
    usersApiClientMock.updateMe.mockResolvedValue({
      id: "user-1",
      username: "cris",
      email: "cris@vinnot.com",
      firstName: "Cristhian",
      lastName: "Bielaszczuk",
      fullName: "Cristhian Bielaszczuk",
      roles: ["ROLE_USER"],
      emailVerified: true,
    });

    const result = await usersService.updateMe({
      username: "cris",
      firstName: "Cristhian",
      lastName: "Bielaszczuk",
    });

    expect(usersApiClientMock.updateMe).toHaveBeenCalledWith({
      username: "cris",
      firstName: "Cristhian",
      lastName: "Bielaszczuk",
    });
    expect(result.name).toBe("Cristhian Bielaszczuk");
  });

  it("delegates account deactivation to the user API port", async () => {
    usersApiClientMock.deactivateAccount.mockResolvedValue();

    await usersService.deactivateAccount();

    expect(usersApiClientMock.deactivateAccount).toHaveBeenCalledTimes(1);
  });

  it("requests verified email change through the user API port", async () => {
    usersApiClientMock.requestEmailChange.mockResolvedValue("Confirmation sent");

    await expect(
      usersService.requestEmailChange("new@vinnot.com"),
    ).resolves.toBe("Confirmation sent");

    expect(usersApiClientMock.requestEmailChange).toHaveBeenCalledWith({
      newEmail: "new@vinnot.com",
    });
  });

  it("delegates permanent deletion with Apple proof when supplied", async () => {
    usersApiClientMock.deleteAccount.mockResolvedValue();
    const input = {
      appleAuthorizationCode: "single-use-code",
      appleClientId: "com.vinnot.app",
    };

    await usersService.deleteAccount(input);

    expect(usersApiClientMock.deleteAccount).toHaveBeenCalledWith(input);
  });

  it("maps stats and onboarding users", async () => {
    usersApiClientMock.getMyStats.mockResolvedValue({ totalReviews: 2 } as never);
    usersApiClientMock.completeOnboarding.mockResolvedValue({
      id: "user-1", username: "ana", email: "ana@vinnot.com", name: "Ana",
      roles: ["ROLE_USER"], emailVerified: true,
    } as never);

    await usersService.getMyStats();
    await usersService.completeOnboarding("ana");
    await usersService.completeOnboarding();

    expect(usersApiClientMock.completeOnboarding).toHaveBeenNthCalledWith(1, { username: "ana" });
    expect(usersApiClientMock.completeOnboarding).toHaveBeenNthCalledWith(2, {});
  });

  it("delegates avatar, password and deletion operations", async () => {
    usersApiClientMock.uploadAvatar.mockResolvedValue({ avatarUrl: "https://img/avatar.jpg" });
    await expect(usersService.uploadAvatar({
      uri: "file:///avatar.jpg", fileName: "avatar.jpg", mimeType: "image/jpeg",
    })).resolves.toBe("https://img/avatar.jpg");
    await usersService.changePassword("Password1!", "Password2!");
    await usersService.deleteAccount();

    expect(usersApiClientMock.changePassword).toHaveBeenCalledWith({
      current_password: "Password1!", new_password: "Password2!",
    });
    expect(usersApiClientMock.deleteAccount).toHaveBeenLastCalledWith({});
  });
});

it('keeps explicit phone clearing in the profile request', async () => {
  usersApiClientMock.updateMe.mockResolvedValue({ id: 'u', email: 'u@example.com', phoneNumber: null } as never);
  const result = await usersService.updateMe({ firstName: 'Guest', phoneNumber: '' });
  expect(usersApiClientMock.updateMe).toHaveBeenLastCalledWith(expect.objectContaining({ phoneNumber: '' }));
  expect(result.phoneNumber).toBeNull();
});

describe("deviceTimezone", () => {
  it("returns the device time zone from the gateway", () => {
    currentZone.mockReturnValue("Europe/Madrid");

    expect(usersService.deviceTimezone()).toBe("Europe/Madrid");
  });
});

describe("syncAccountLocale", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usersApiClientMock.updatePreferences.mockResolvedValue({ id: "u", email: "u@example.com" });
  });

  it("sends the account language and the device time zone", async () => {
    currentZone.mockReturnValue("Europe/Madrid");

    await usersService.syncAccountLocale("en-US");

    expect(usersApiClientMock.updatePreferences).toHaveBeenCalledWith({
      preferredLanguage: "en",
      timezone: "Europe/Madrid",
    });
  });

  it("sends only the language when the device reports no zone", async () => {
    currentZone.mockReturnValue(undefined);

    await usersService.syncAccountLocale("es-AR");

    expect(usersApiClientMock.updatePreferences).toHaveBeenCalledWith({ preferredLanguage: "es" });
  });

  it("keeps the language when the server does not recognise the device zone", async () => {
    currentZone.mockReturnValue("Etc/Unknown");
    usersApiClientMock.updatePreferences
      .mockRejectedValueOnce(new ApiError(400, "INVALID_TIMEZONE", "Invalid"))
      .mockResolvedValueOnce({ id: "u", email: "u@example.com" });

    await usersService.syncAccountLocale("en-US");

    expect(usersApiClientMock.updatePreferences).toHaveBeenNthCalledWith(2, { preferredLanguage: "en" });
  });

  it("propagates other failures without retrying", async () => {
    currentZone.mockReturnValue("Europe/Madrid");
    const offline = new NetworkError("Offline");
    usersApiClientMock.updatePreferences.mockRejectedValue(offline);

    await expect(usersService.syncAccountLocale("en-US")).rejects.toBe(offline);
    expect(usersApiClientMock.updatePreferences).toHaveBeenCalledTimes(1);
  });
});
