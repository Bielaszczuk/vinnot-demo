import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import {
  AuthApiError,
  authService,
  AuthValidationError,
} from "./auth.service";
import { authClient } from "@/infrastructure/api/clients/auth.client";
import { ApiError, NetworkError } from "@/infrastructure/api/errors";
import { mapUserFromDto } from "@/domain/user/user.mappers";
import type { User } from "@/domain/user/user.types";
import type {
  AuthResponseDto,
  MeResponseDto,
} from "@/infrastructure/api/dto/auth.dto";

jest.mock("@/infrastructure/api/clients/auth.client", () => ({
  authClient: {
    login: jest.fn(),
    register: jest.fn(),
    socialLogin: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    validatePasswordResetToken: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
  },
}));

jest.mock("@/domain/user/user.mappers", () => ({
  mapUserFromDto: jest.fn(),
}));

const authClientMock = authClient as jest.Mocked<typeof authClient>;
const mapUserFromDtoMock = mapUserFromDto as jest.MockedFunction<typeof mapUserFromDto>;

describe("auth.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws validation error when login data is incomplete", async () => {
    await expect(authService.login("", "")).rejects.toBeInstanceOf(AuthValidationError);
  });

  it("maps login response into auth result", async () => {
    const loginResponse: AuthResponseDto = {
      accessToken: "token-a",
      refreshToken: "token-r",
      expiresIn: 3600,
      tokenType: "Bearer",
      user: {
        id: "usr-1",
        username: "ana",
        email: "ana@vinnot.com",
        name: "Ana",
        avatarUrl: null,
        roles: ["ROLE_USER"],
        emailVerified: true,
      },
    };
    authClientMock.login.mockResolvedValue(loginResponse);
    mapUserFromDtoMock.mockReturnValue({
      id: "usr-1",
      username: "ana",
      email: "ana@vinnot.com",
      firstName: "Ana",
      lastName: "",
      name: "Ana",
      avatarUrl: null,
      roles: ["ROLE_USER"],
      emailVerified: true,
      hasSocialIdentity: false,
      hasPassword: true,
      socialProviders: [],
      onboardingCompleted: true,
      createdAt: "2026-05-30T10:00:00.000Z",
      updatedAt: "2026-05-30T10:00:00.000Z",
    });

    const result = await authService.login("ana@vinnot.com", "Secret123");

    expect(authClientMock.login).toHaveBeenCalledWith({
      usernameOrEmail: "ana@vinnot.com",
      password: "Secret123",
    });
    expect(mapUserFromDtoMock).toHaveBeenCalled();
    expect(result.tokens.accessToken).toBe("token-a");
    expect(result.user.id).toBe("usr-1");
  });

  it("uses the persisted access token when restoring the current user", async () => {
    const meResponse: MeResponseDto = {
      id: "usr-1",
      username: "ana",
      email: "ana@vinnot.com",
      name: "Ana",
      avatarUrl: null,
      roles: ["ROLE_USER"],
      emailVerified: true,
      onboardingCompleted: true,
      createdAt: "2026-05-30T10:00:00.000Z",
      updatedAt: "2026-05-30T10:00:00.000Z",
    };
    const mappedUser: User = {
      id: meResponse.id,
      username: meResponse.username,
      email: meResponse.email,
      firstName: "Ana",
      lastName: "",
      name: "Ana",
      avatarUrl: meResponse.avatarUrl ?? null,
      roles: ["ROLE_USER"],
      emailVerified: meResponse.emailVerified,
      hasSocialIdentity: false,
      hasPassword: true,
      socialProviders: [],
      onboardingCompleted: true,
      createdAt: meResponse.createdAt,
      updatedAt: meResponse.updatedAt,
    };
    authClientMock.getCurrentUser.mockResolvedValue(meResponse);
    mapUserFromDtoMock.mockReturnValue(mappedUser);

    const result = await authService.getCurrentUser("persisted-access-token");

    expect(authClientMock.getCurrentUser).toHaveBeenCalledWith(
      "persisted-access-token",
    );
    expect(result).toEqual(mappedUser);
  });

  it("returns the rotated refresh token supplied by the backend", async () => {
    authClientMock.refreshToken.mockResolvedValue({
      accessToken: "new-access",
      refreshToken: "rotated-refresh",
      expiresIn: 3600,
    });

    await expect(authService.refreshToken("old-refresh")).resolves.toEqual({
      accessToken: "new-access",
      refreshToken: "rotated-refresh",
      expiresIn: 3600,
    });
  });

  it("does not expire the session when refresh fails because of connectivity", async () => {
    authClientMock.refreshToken.mockRejectedValue(new NetworkError());

    const error = await authService.refreshToken("refresh-token").catch((reason) => reason);

    expect(error).toBeInstanceOf(AuthApiError);
    expect(error).toMatchObject({
      statusCode: 0,
      isSessionExpired: false,
    });
  });

  it("expires the session when the backend rejects the refresh token", async () => {
    authClientMock.refreshToken.mockRejectedValue(
      new ApiError(400, "INVALID_TOKEN", "Invalid or expired refresh token"),
    );

    const error = await authService.refreshToken("invalid-refresh").catch((reason) => reason);

    expect(error).toBeInstanceOf(AuthApiError);
    expect(error).toMatchObject({
      statusCode: 400,
      isSessionExpired: true,
      code: "INVALID_TOKEN",
    });
  });

  it("validates registration and maps a successful registration", async () => {
    await expect(authService.register("", "", "", "", "")).rejects.toBeInstanceOf(
      AuthValidationError,
    );
    authClientMock.register.mockResolvedValue({
      userId: "user-1",
      email: "ana@vinnot.com",
      emailVerificationRequired: true,
      message: "Revisá tu correo",
    });

    await expect(
      authService.register("ana", "ana@vinnot.com", "Password1!", "Ana", "Pérez"),
    ).resolves.toMatchObject({ userId: "user-1", emailVerificationRequired: true });
  });

  it("maps social login and account lifecycle messages", async () => {
    const response = {
      accessToken: "access",
      refreshToken: "refresh",
      expiresIn: 3600,
      tokenType: "Bearer",
      user: {
        id: "user-1",
        username: "ana",
        email: "ana@vinnot.com",
        name: "Ana",
        avatarUrl: null,
        roles: ["ROLE_USER"],
        emailVerified: true,
      },
    } as AuthResponseDto;
    authClientMock.socialLogin.mockResolvedValue(response);
    mapUserFromDtoMock.mockReturnValue({ id: "user-1" } as User);
    authClientMock.forgotPassword.mockResolvedValue({ message: "forgot" });
    authClientMock.resetPassword.mockResolvedValue({ message: "reset" });
    authClientMock.verifyEmail.mockResolvedValue({ message: "verified" });
    authClientMock.resendVerificationEmail.mockResolvedValue({ message: "resent" });

    await expect(
      authService.socialLogin({ provider: "GOOGLE", token: "provider-token" }),
    ).resolves.toMatchObject({ user: { id: "user-1" }, tokens: { accessToken: "access" } });
    await expect(authService.forgotPassword("ana@vinnot.com")).resolves.toBe("forgot");
    await expect(authService.resetPassword("token", "Password2!")).resolves.toBe("reset");
    await expect(authService.verifyEmail("token")).resolves.toBe("verified");
    await expect(authService.resendVerification("ana@vinnot.com")).resolves.toBe("resent");
  });

  it("returns a translatable message for each confirmation code and the server text for unknown codes", async () => {
    authClientMock.verifyEmail.mockResolvedValue({ code: "EMAIL_VERIFIED", message: "Email verified successfully" });
    authClientMock.resetPassword.mockResolvedValue({ code: "PASSWORD_RESET", message: "Password has been reset successfully" });
    authClientMock.forgotPassword.mockResolvedValue({ code: "PASSWORD_RESET_LINK_SENT", message: "If an account exists" });
    authClientMock.resendVerificationEmail.mockResolvedValue({ code: "VERIFICATION_EMAIL_SENT", message: "If verification is pending" });

    await expect(authService.verifyEmail("token")).resolves.toBe("authMessages.emailVerified");
    await expect(authService.resetPassword("token", "Password2!")).resolves.toBe("authMessages.passwordReset");
    await expect(authService.forgotPassword("ana@vinnot.com")).resolves.toBe("authMessages.passwordResetLinkSent");
    await expect(authService.resendVerification("ana@vinnot.com")).resolves.toBe("authMessages.verificationEmailSent");

    authClientMock.verifyEmail.mockResolvedValue({ code: "SOMETHING_NEW", message: "Server text" });
    await expect(authService.verifyEmail("token")).resolves.toBe("Server text");
  });

  it("maps API, validation, provider and unknown failures consistently", async () => {
    authClientMock.login.mockRejectedValueOnce(new ApiError(401, "INVALID", "bad"));
    await expect(authService.login("ana", "bad")).rejects.toMatchObject({
      statusCode: 401,
      message: "authErrors.invalidCredentials",
    });

    authClientMock.register.mockRejectedValueOnce(
      new ApiError(400, "VALIDATION_ERROR", "invalid", { email: ["ocupado"] }),
    );
    await expect(
      authService.register("ana", "used@vinnot.com", "Password1!", "Ana", "Pérez"),
    ).rejects.toBeInstanceOf(AuthValidationError);

    authClientMock.socialLogin.mockRejectedValueOnce(
      new ApiError(403, "EMAIL_NOT_VERIFIED", "not verified"),
    );
    await expect(
      authService.socialLogin({ provider: "FACEBOOK", token: "token" }),
    ).rejects.toMatchObject({ message: "authErrors.emailNotVerified" });

    authClientMock.forgotPassword.mockRejectedValueOnce(new NetworkError());
    await expect(authService.forgotPassword("ana@vinnot.com")).rejects.toMatchObject({
      statusCode: 0,
    });

    authClientMock.resetPassword.mockRejectedValueOnce(new Error("unexpected"));
    await expect(authService.resetPassword("token", "Password2!")).rejects.toMatchObject({
      statusCode: 0,
    });

    authClientMock.verifyEmail.mockRejectedValueOnce(new NetworkError());
    await expect(authService.verifyEmail("token")).rejects.toMatchObject({ statusCode: 0 });
    authClientMock.resendVerificationEmail.mockRejectedValueOnce(new Error("unexpected"));
    await expect(authService.resendVerification("ana@vinnot.com"))
      .rejects.toMatchObject({ statusCode: 0 });
  });

  it("checks a reset-password link before the form is shown", async () => {
    authClientMock.validatePasswordResetToken.mockResolvedValueOnce({ valid: false, status: "EXPIRED" });
    await expect(authService.validatePasswordResetToken("opaque")).resolves.toBe("EXPIRED");
    expect(authClientMock.validatePasswordResetToken).toHaveBeenCalledWith("opaque");

    authClientMock.validatePasswordResetToken.mockResolvedValueOnce({ valid: true, status: "VALID" });
    await expect(authService.validatePasswordResetToken("opaque")).resolves.toBe("VALID");

    authClientMock.validatePasswordResetToken.mockRejectedValueOnce(new NetworkError());
    await expect(authService.validatePasswordResetToken("opaque")).rejects.toMatchObject({
      statusCode: 0,
      message: "authErrors.offline",
    });
  });

  it("keeps translating every known backend code exactly as before", async () => {
    const known: [string, string][] = [
      ["EMAIL_NOT_VERIFIED", "authErrors.emailNotVerified"],
      ["TERMS_VERSION_CHANGED", "authErrors.termsVersionChanged"],
      ["ACCOUNT_TEMPORARILY_LOCKED", "authErrors.temporarilyLocked"],
      ["EMAIL_ALREADY_EXISTS", "authErrors.emailAlreadyExists"],
      ["USERNAME_ALREADY_EXISTS", "authErrors.usernameAlreadyExists"],
    ];
    for (const [code, message] of known) {
      authClientMock.register.mockRejectedValueOnce(new ApiError(409, code, "Server text"));
      await expect(
        authService.register("ana", "ana@vinnot.com", "Password1!", "Ana", "Pérez"),
      ).rejects.toMatchObject({ message, code, statusCode: 409 });
    }
  });

  it("never shows the server message for an unknown code or a validation failure", async () => {
    authClientMock.login.mockRejectedValueOnce(new ApiError(500, "PROVIDER_FAILURE", "Provider exploded"));
    await expect(authService.login("ana@vinnot.com", "Password1!")).rejects.toMatchObject({
      message: "authErrors.loginFailed",
      code: "PROVIDER_FAILURE",
      statusCode: 500,
    });

    authClientMock.register.mockRejectedValueOnce(
      new ApiError(400, "VALIDATION_ERROR", "Validation failed", { email: ["taken"] }),
    );
    await expect(
      authService.register("ana", "ana@vinnot.com", "Password1!", "Ana", "Pérez"),
    ).rejects.toMatchObject({ message: "authErrors.registerFailed" });

    authClientMock.refreshToken.mockRejectedValueOnce(new ApiError(500, "PROVIDER_FAILURE", "provider failed"));
    await expect(authService.refreshToken("refresh")).rejects.toMatchObject({
      message: "authErrors.refreshFailed",
      statusCode: 500,
    });

    authClientMock.getCurrentUser.mockRejectedValueOnce(new ApiError(500, "PROVIDER_FAILURE", "provider failed"));
    await expect(authService.getCurrentUser()).rejects.toMatchObject({
      message: "authErrors.unexpected",
      statusCode: 500,
      isSessionExpired: false,
    });
  });

  it("translates a terms version change during sign-up instead of the server text", async () => {
    authClientMock.register.mockRejectedValueOnce(
      new ApiError(409, "TERMS_VERSION_CHANGED", "Terms version changed, please review"),
    );
    await expect(
      authService.register("ana", "ana@vinnot.com", "Password1!", "Ana", "Pérez"),
    ).rejects.toMatchObject({
      message: "authErrors.termsVersionChanged",
      code: "TERMS_VERSION_CHANGED",
      statusCode: 409,
    });
  });

  it("translates a temporary sign-in lock instead of the server text", async () => {
    authClientMock.login.mockRejectedValueOnce(
      new ApiError(423, "ACCOUNT_TEMPORARILY_LOCKED", "Too many failed attempts"),
    );
    await expect(authService.login("ana@vinnot.com", "wrong")).rejects.toMatchObject({
      message: "authErrors.temporarilyLocked",
      code: "ACCOUNT_TEMPORARILY_LOCKED",
      statusCode: 423,
    });
  });

  it("maps refresh and current-user failure semantics", async () => {
    authClientMock.refreshToken.mockRejectedValueOnce(
      new ApiError(500, "PROVIDER_FAILURE", "provider failed"),
    );
    await expect(authService.refreshToken("refresh")).rejects.toMatchObject({
      statusCode: 500,
      isSessionExpired: false,
    });
    authClientMock.refreshToken.mockRejectedValueOnce(new Error("unexpected"));
    await expect(authService.refreshToken("refresh")).rejects.toMatchObject({
      message: "authErrors.refreshFailed",
    });

    authClientMock.getCurrentUser.mockRejectedValueOnce(
      new ApiError(401, "INVALID_TOKEN", "expired"),
    );
    await expect(authService.getCurrentUser()).rejects.toMatchObject({
      message: "authErrors.sessionExpired",
      isSessionExpired: true,
    });
    authClientMock.getCurrentUser.mockRejectedValueOnce(new NetworkError());
    await expect(authService.getCurrentUser()).rejects.toMatchObject({ message: "authErrors.offline" });
    authClientMock.getCurrentUser.mockRejectedValueOnce(new Error("unexpected"));
    await expect(authService.getCurrentUser()).rejects.toMatchObject({ message: "authErrors.offline" });
  });

  it("always completes local logout even if the server is unavailable", async () => {
    authClientMock.logout.mockResolvedValueOnce({ message: "Sesión cerrada" });
    await authService.logout("refresh");
    expect(authClientMock.logout).toHaveBeenCalledWith({ refreshToken: "refresh" });

    authClientMock.logout.mockResolvedValueOnce({ message: "Sesión cerrada" });
    await authService.logout("refresh", "ExponentPushToken[abc]");
    expect(authClientMock.logout).toHaveBeenLastCalledWith({ refreshToken: "refresh", pushToken: "ExponentPushToken[abc]" });

    authClientMock.logout.mockRejectedValueOnce(new NetworkError());
    await expect(authService.logout()).resolves.toBeUndefined();
    expect(authClientMock.logout).toHaveBeenLastCalledWith(undefined);
  });
});
