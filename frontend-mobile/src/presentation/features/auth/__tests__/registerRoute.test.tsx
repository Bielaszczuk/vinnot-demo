import React from "react";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import RegisterScreen from "../../../../../app/(auth)/register";
import { AuthValidationError } from "@/presentation/features/auth";

const mockSelection = { version: "v1", locale: "es", contentHash: "a".repeat(64), accepted: true };
jest.mock("@/presentation/hooks/useLegalAgreement", () => ({ useLegalAgreement: () => ({ selection: mockSelection, error: false }) }));
jest.mock("@/presentation/features/public/TermsReview", () => ({ TermsReview: () => null }));
const mockReplace = jest.fn();
const mockRegister = jest.fn();
const mockSocialLogin = jest.fn();
const mockAcquireSocialCredential = jest.fn();
const mockShowSuccess = jest.fn();
const mockSetError = jest.fn();

let mockIsAuthenticated = false;
let mockUser: { onboardingCompleted: boolean } | null = null;
let mockSubmitPayload = {
  username: "  ana  ",
  email: "  ana@vinnot.com  ",
  password: "Secret123!",
  confirmPassword: "Secret123!",
  firstName: " Ana ",
  lastName: " Perez ",
};

function authResult(onboardingCompleted = true) {
  return {
    user: { onboardingCompleted },
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
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/presentation/hooks/useAuth", () => ({
  useAuth: () => ({
    register: mockRegister,
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
    handleSubmit: (callback: (payload: typeof mockSubmitPayload) => Promise<void> | void) => () => callback(mockSubmitPayload),
    setError: mockSetError,
    watch: () => mockSubmitPayload.password,
    formState: {
      errors: {},
      isSubmitting: false,
    },
  }),
}));

jest.mock("@/presentation/features/auth", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  const actual = jest.requireActual<typeof import("@/presentation/features/auth")>("@/presentation/features/auth");

  return {
    ...actual,
    RegisterScreenView: ({
      onSubmit,
      onSocial,
      serverError,
    }: {
      onSubmit: () => void;
      onSocial: (provider: "GOOGLE") => void;
      serverError: string | null;
    }) => mockReact.createElement(
      "View",
      null,
      serverError ? mockReact.createElement("Text", { testID: "server-error" }, serverError) : null,
      mockReact.createElement(
        "Text",
        { testID: "submit", onPress: onSubmit },
        "submit",
      ),
      mockReact.createElement(
        "Text",
        { testID: "social", onPress: () => onSocial("GOOGLE") },
        "social",
      ),
    ),
  };
});

describe("register route container", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = false;
    mockUser = null;
    mockSubmitPayload = {
      username: "  ana  ",
      email: "  ana@vinnot.com  ",
      password: "Secret123!",
      confirmPassword: "Secret123!",
      firstName: " Ana ",
      lastName: " Perez ",
    };
  });

  it("redirects to home when user is already authenticated", async () => {
    mockIsAuthenticated = true;
    mockUser = { onboardingCompleted: true };
    render(<RegisterScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(app)/(tabs)/home");
    });
  });

  it("submits register payload with trimmed identity fields", async () => {
    mockRegister.mockImplementation(async () => ({
      userId: "user-id",
      email: "ana@vinnot.com",
      emailVerificationRequired: true,
      message: "User registered. Check your email to activate the account",
    }));
    const screen = render(<RegisterScreen />);
    fireEvent.press(screen.getByTestId("submit"));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        "ana",
        "ana@vinnot.com",
        "Secret123!",
        "Ana",
        "Perez",
        mockSelection,
      );
    });

    // The server text is not localized; the toast always uses the app language.
    expect(mockShowSuccess).toHaveBeenCalledWith("auth.registerSuccess");
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/(auth)/register-success",
      params: { email: "ana@vinnot.com" },
    });
  });

  it("maps validation errors to form fields and keeps server message", async () => {
    mockRegister.mockImplementation(async () => {
      throw new AuthValidationError("Datos inválidos", {
        username: ["Username inválido"],
        firstName: ["Nombre requerido"],
      });
    });

    const screen = render(<RegisterScreen />);
    fireEvent.press(screen.getByTestId("submit"));

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith(
        "username",
        expect.objectContaining({ type: "server", message: "Username inválido" }),
      );
      expect(mockSetError).toHaveBeenCalledWith(
        "firstName",
        expect.objectContaining({ type: "server", message: "Nombre requerido" }),
      );
    });

    expect(screen.getByTestId("server-error").props.children).toBe("Datos inválidos");
  });

  it("exchanges a social credential and authenticates", async () => {
    const credential = { provider: "GOOGLE" as const, token: "google-token" };
    mockAcquireSocialCredential.mockImplementation(async () => credential);
    mockSocialLogin.mockImplementation(async () => authResult());
    const screen = render(<RegisterScreen />);
    fireEvent.press(screen.getByTestId("social"));

    await waitFor(() => {
      expect(mockAcquireSocialCredential).toHaveBeenCalledWith("GOOGLE");
      expect(mockSocialLogin).toHaveBeenCalledWith(credential);
      expect(mockReplace).toHaveBeenCalledWith("/(app)/(tabs)/home");
    });
  });
});
