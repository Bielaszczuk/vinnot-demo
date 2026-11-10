import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { http } from "@/infrastructure/api/http";
import { usersApiClient } from "./users.client";

jest.mock("@/infrastructure/api/http", () => ({
  http: {
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/shared/config/env", () => ({
  env: {
    apiBaseUrl: "https://api-dev.vinnot.com/api",
  },
}));

const httpMock = http as jest.Mocked<typeof http>;

describe("usersApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("unwraps current-user statistics from the standard API response", async () => {
    const stats = {
      totalReviews: 3,
      totalCellarWines: 7,
      cellarCount: 7,
      eventsAttended: 2,
      averageRating: 4.5,
    };
    httpMock.get.mockResolvedValue({
      data: {
        data: stats,
        timestamp: "2026-07-23T00:00:00Z",
      },
    });

    await expect(usersApiClient.getMyStats()).resolves.toEqual(stats);
    expect(httpMock.get).toHaveBeenCalledWith("/users/me/stats");
  });

  it("unwraps the updated user from the standard API response", async () => {
    const user = {
      id: "user-1",
      email: "user@vinnot.com",
      firstName: "Vinnot",
      lastName: "User",
      fullName: "Vinnot User",
    };
    httpMock.patch.mockResolvedValue({
      data: {
        data: user,
        timestamp: "2026-07-23T00:00:00Z",
      },
    });

    await expect(
      usersApiClient.updateMe({
        firstName: "Vinnot",
        lastName: "User",
      }),
    ).resolves.toEqual(user);
    expect(httpMock.patch).toHaveBeenCalledWith("/users/me", {
      firstName: "Vinnot",
      lastName: "User",
    });
  });

  it("completes social onboarding with an optional username", async () => {
    const user = {
      id: "user-1",
      username: "copa.andina",
      email: "user@vinnot.com",
      name: "Vinnot User",
      onboardingCompleted: true,
    };
    httpMock.post.mockResolvedValue({
      data: {
        data: user,
        timestamp: "2026-07-23T00:00:00Z",
      },
    });

    await expect(usersApiClient.completeOnboarding({ username: "copa.andina" })).resolves.toEqual(
      user,
    );
    expect(httpMock.post).toHaveBeenCalledWith("/users/me/onboarding", { username: "copa.andina" });
  });

  it("uploads the avatar using the backend multipart field and unwraps its response", async () => {
    httpMock.post.mockResolvedValue({
      data: {
        data: { avatarUrl: "/api/uploads/avatars/avatar.jpg" },
        timestamp: "2026-07-23T00:00:00Z",
      },
    });

    await expect(
      usersApiClient.uploadAvatar({
        uri: "file:///avatar.jpg",
        fileName: "avatar.jpg",
        mimeType: "image/jpeg",
      }),
    ).resolves.toEqual({
      avatarUrl: "https://api-dev.vinnot.com/api/uploads/avatars/avatar.jpg",
    });

    const [path, body, config] = httpMock.post.mock.calls[0]!;
    expect(path).toBe("/users/me/avatar");
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("file")).toBeTruthy();
    expect((body as FormData).get("avatar")).toBeNull();
    expect(config).toEqual({ headers: { "Content-Type": "multipart/form-data" } });
  });

  it("patches the account language and time zone and unwraps the updated user", async () => {
    httpMock.patch.mockResolvedValue({
      data: { data: { id: "user-1", email: "user@vinnot.com", preferredLanguage: "en", timezone: "Europe/Madrid" } },
    });

    const user = await usersApiClient.updatePreferences({ preferredLanguage: "en", timezone: "Europe/Madrid" });

    expect(httpMock.patch).toHaveBeenCalledWith("/users/me/preferences", {
      preferredLanguage: "en",
      timezone: "Europe/Madrid",
    });
    expect(user).toMatchObject({ preferredLanguage: "en", timezone: "Europe/Madrid" });
  });

  it("deactivates the current account through the authenticated user endpoint", async () => {
    httpMock.delete.mockResolvedValue({ data: undefined });

    await expect(usersApiClient.deactivateAccount()).resolves.toBeUndefined();

    expect(httpMock.delete).toHaveBeenCalledWith("/users/me");
  });

  it("permanently deletes the current account with optional Apple proof", async () => {
    httpMock.delete.mockResolvedValue({ data: undefined });
    const request = {
      appleAuthorizationCode: "single-use-code",
      appleClientId: "com.vinnot.app",
    };

    await expect(usersApiClient.deleteAccount(request)).resolves.toBeUndefined();

    expect(httpMock.delete).toHaveBeenCalledWith("/users/me/permanent", {
      data: request,
    });
  });
});
