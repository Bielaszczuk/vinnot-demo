import React from "react";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import LoginScreen from "../../../../../app/(auth)/login";
import { AuthApiError, AuthValidationError } from "@/presentation/features/auth";
import type { AuthResult, SocialLoginRequest } from "@/presentation/features/auth";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockLogin =
  jest.fn<
    (usernameOrEmail: string, password: string, reactivate?: boolean) => Promise<AuthResult>
  >();
const mockSocialLogin = jest.fn<(request: SocialLoginRequest) => Promise<AuthResult>>();
const mockAcquireSocialCredential =
  jest.fn<(provider: SocialLoginRequest["provider"]) => Promise<SocialLoginRequest>>();
const mockShowSuccess = jest.fn();
const mockSetError = jest.fn();
const mockAlert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

const mockClearReturnPath = jest.fn();
let mockReturnPath: string | undefined;
let mockIsAuthenticated = false;
let mockUser: { onboardingCompleted: boolean } | null = null;
let mockSubmitPayload = { email: " test@vinnot.com ", password: "Secret123!" };

function authResult(onboardingCompleted = true): AuthResult {
  return {
    user: {
      id: "user-1",
      username: "vinnot-user",
      email: "user@vinnot.com",
      firstName: "Vinnot",
      lastName: "User",
      name: "Vinnot User",
      avatarUrl: null,
      roles: ["ROLE_USER"],
      emailVerified: true,
      hasSocialIdentity: false,
      hasPassword: true,
      socialProviders: [],
      onboardingCompleted,
      createdAt: "2026-07-24T00:00:00Z",
      updatedAt: "2026-07-24T00:00:00Z",
    },
    tokens: {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresIn: 3600,
    },
  };
}

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/presentation/hooks/useAuth", () => ({
  useAuth: () => ({
    returnPath: mockReturnPath,
    clearReturnPath: mockClearReturnPath,
    login: mockLogin,
    socialLogin: mockSocialLogin,
    isAuthenticated: mockIsAuthenticated,
    user: mockUser,
  }),
}));

jest.mock("@/presentation/hooks/useAccountActions", () => ({
  useAccountActions: () => ({
    acquireSocialCredential: mockAcquireSocialCredential,
  }),
}));

jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
  }),
}));

jest.mock("@hookform/resolvers/zod", () => ({
  zodResolver: () => undefined,
}));

jest.mock("react-hook-form", () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (callback: (payload: typeof mockSubmitPayload) => Promise<void> | void) => () =>
      callback(mockSubmitPayload),
    setError: mockSetError,
    formState: {
      errors: {},
      isSubmitting: false,
    },
  }),
}));

jest.mock("@/presentation/features/auth", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  const actual = jest.requireActual<typeof import("@/presentation/features/auth")>(
    "@/presentation/features/auth",
  );

  return {
    ...actual,
    LoginScreenView: ({
      onSubmit,
      onSocial,
      onForgotPassword,
      serverError,
    }: {
      onSubmit: () => void;
      onSocial: (provider: "GOOGLE") => void;
      onForgotPassword: () => void;
      serverError: string | null;
    }) =>
      mockReact.createElement(
        "View",
        null,
        serverError
          ? mockReact.createElement("Text", { testID: "server-error" }, serverError)
          : null,
        mockReact.createElement("Text", { testID: "submit", onPress: onSubmit }, "submit"),
        mockReact.createElement(
          "Text",
          { testID: "social", onPress: () => onSocial("GOOGLE") },
          "social",
        ),
        mockReact.createElement("Text", { testID: "forgot", onPress: onForgotPassword }, "forgot"),
      ),
  };
});

describe("login route container", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReturnPath = undefined;
    mockIsAuthenticated = false;
    mockUser = null;
    mockSubmitPayload = { email: " test@vinnot.com ", password: "Secret123!" };
  });

  it("redirects to home when user is already authenticated", async () => {
    mockIsAuthenticated = true;
    mockUser = { onboardingCompleted: true };
    render(<LoginScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(app)/(tabs)/home");
    });
  });

  it("submits login, trims email and shows success feedback", async () => {
    mockLogin.mockImplementation(async () => authResult());
    const screen = render(<LoginScreen />);

    fireEvent.press(screen.getByTestId("submit"));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("test@vinnot.com", "Secret123!");
    });
    expect(mockShowSuccess).toHaveBeenCalledWith("auth.loginSuccess");
    expect(mockReplace).toHaveBeenCalledWith("/(app)/(tabs)/home");
  });

  it("returns to the protected destination after login and consumes the intent", async () => {
    mockReturnPath = "/events/fixture";
    mockLogin.mockResolvedValueOnce(authResult());
    const screen = render(<LoginScreen />);
    fireEvent.press(screen.getByTestId("submit"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/events/fixture"));
    expect(mockClearReturnPath).toHaveBeenCalledTimes(1);
  });

  it.each(['/wines/', '/events/', '/routes/'])('returns to a shared %s item after signing in', async prefix => {
    mockReturnPath = prefix + '758a7f04-2678-4b92-8f5a-00272d150318';
    mockLogin.mockResolvedValueOnce(authResult());
    const screen = render(<LoginScreen />);
    fireEvent.press(screen.getByTestId('submit'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(mockReturnPath));
    expect(mockClearReturnPath).toHaveBeenCalledTimes(1);
  });

  it("retains the destination while social onboarding is incomplete", async () => {
    mockReturnPath = "/events/fixture";
    mockAcquireSocialCredential.mockResolvedValueOnce({ provider: "GOOGLE", token: "token" });
    mockSocialLogin.mockResolvedValueOnce(authResult(false));
    const screen = render(<LoginScreen />);
    fireEvent.press(screen.getByTestId("social"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(app)/complete-profile"));
    expect(mockClearReturnPath).not.toHaveBeenCalled();
  });

  it("maps backend validation errors into form field errors", async () => {
    mockLogin.mockImplementation(async () => {
      throw new AuthValidationError("Credenciales inválidas", {
        email: ["Email inválido"],
        password: ["Password inválido"],
      });
    });

    const screen = render(<LoginScreen />);
    fireEvent.press(screen.getByTestId("submit"));

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith(
        "email",
        expect.objectContaining({ type: "server", message: "Email inválido" }),
      );
      expect(mockSetError).toHaveBeenCalledWith(
        "password",
        expect.objectContaining({ type: "server", message: "Password inválido" }),
      );
    });

    expect(screen.getByTestId("server-error").props.children).toBe("Credenciales inválidas");
  });

  it("exchanges a social credential and opens password recovery", async () => {
    const credential = { provider: "GOOGLE" as const, token: "google-token" };
    mockAcquireSocialCredential.mockImplementation(async () => credential);
    mockSocialLogin.mockImplementation(async () => authResult(false));
    const screen = render(<LoginScreen />);
    fireEvent.press(screen.getByTestId("social"));
    fireEvent.press(screen.getByTestId("forgot"));

    await waitFor(() => {
      expect(mockAcquireSocialCredential).toHaveBeenCalledWith("GOOGLE");
      expect(mockSocialLogin).toHaveBeenCalledWith(credential);
    });
    expect(mockPush).toHaveBeenCalledWith("/(auth)/forgot-password");
    expect(mockReplace).toHaveBeenCalledWith("/(app)/complete-profile");
  });

  it("reactivates a deactivated manual account only after confirmation", async () => {
    mockLogin
      .mockRejectedValueOnce(
        new AuthApiError("Cuenta desactivada", 422, false, "ACCOUNT_DEACTIVATED"),
      )
      .mockResolvedValueOnce(authResult());
    const screen = render(<LoginScreen />);

    fireEvent.press(screen.getByTestId("submit"));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        "auth.reactivateAccountTitle",
        "auth.reactivateAccountMessage",
        expect.any(Array),
      );
    });
    const buttons = mockAlert.mock.calls[0]?.[2] as Array<{
      onPress?: () => void;
    }>;
    buttons[1]?.onPress?.();

    await waitFor(() => {
      expect(mockLogin).toHaveBeenLastCalledWith("test@vinnot.com", "Secret123!", true);
    });
    expect(mockReplace).toHaveBeenCalledWith("/(app)/(tabs)/home");
  });

  it("reuses the verified social credential when reactivation is confirmed", async () => {
    const credential = { provider: "GOOGLE" as const, token: "google-token" };
    mockAcquireSocialCredential.mockResolvedValue(credential);
    mockSocialLogin
      .mockRejectedValueOnce(
        new AuthApiError("Cuenta desactivada", 422, false, "ACCOUNT_DEACTIVATED"),
      )
      .mockResolvedValueOnce(authResult());
    const screen = render(<LoginScreen />);

    fireEvent.press(screen.getByTestId("social"));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalled();
    });
    const buttons = mockAlert.mock.calls[0]?.[2] as Array<{
      onPress?: () => void;
    }>;
    buttons[1]?.onPress?.();

    await waitFor(() => {
      expect(mockSocialLogin).toHaveBeenLastCalledWith({
        ...credential,
        reactivate: true,
      });
    });
    expect(mockAcquireSocialCredential).toHaveBeenCalledTimes(1);
  });
});
