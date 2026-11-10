import React from "react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import i18n from "@/shared/i18n";
import ResetPasswordScreen from "../../../../../app/(auth)/reset-password";

const mockReplace = jest.fn();
const mockValidate = jest.fn<(token: string) => Promise<string>>();
const mockReset = jest.fn<(token: string, password: string) => Promise<string>>();
let mockParams: { token?: string } = { token: "opaque" };

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@/application/services/auth.service", () => {
  const actual = jest.requireActual<typeof import("@/application/services/auth.service")>(
    "@/application/services/auth.service",
  );
  return {
    ...actual,
    authService: {
      ...actual.authService,
      resetPassword: (token: string, password: string) => mockReset(token, password),
      validatePasswordResetToken: (token: string) => mockValidate(token),
    },
  };
});

describe("reset password route", () => {
  const previous = i18n.language;
  beforeAll(async () => {
    await i18n.changeLanguage("en-US");
  });
  afterAll(async () => {
    await i18n.changeLanguage(previous);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { token: "opaque" };
  });

  it("checks the link first and shows the form only when it is valid", async () => {
    let resolve: (status: string) => void = () => undefined;
    mockValidate.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<ResetPasswordScreen />);

    expect(mockValidate).toHaveBeenCalledWith("opaque");
    expect(screen.getByText("Checking the link…")).toBeTruthy();
    expect(screen.queryByText("New password")).toBeNull();

    resolve("VALID");
    await waitFor(() => expect(screen.getByText("New password")).toBeTruthy());
    expect(screen.queryByText("Checking the link…")).toBeNull();
  });

  it.each([
    ["USED", "This link was already used. Request a new one to recover your account."],
    ["EXPIRED", "This link has expired. Request a new one to recover your account."],
    ["INVALID", "The link is invalid or has expired."],
  ])("hides the form for a %s link and offers a new one", async (status, message) => {
    mockValidate.mockResolvedValue(status);
    render(<ResetPasswordScreen />);

    await waitFor(() => expect(screen.getByText(message)).toBeTruthy());
    expect(screen.queryByText("New password")).toBeNull();
    fireEvent.press(screen.getByText("Request a new link"));
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/forgot-password");
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("shows the error and no form when the check fails", async () => {
    mockValidate.mockRejectedValue(new Error("authErrors.offline"));
    render(<ResetPasswordScreen />);

    await waitFor(() => expect(screen.getByText("No connection. Check your internet.")).toBeTruthy());
    expect(screen.queryByText("New password")).toBeNull();
  });

  it("still resets the password through a valid link", async () => {
    mockValidate.mockResolvedValue("VALID");
    mockReset.mockResolvedValue("Password updated.");
    render(<ResetPasswordScreen />);
    await waitFor(() => expect(screen.getByText("New password")).toBeTruthy());

    const [password, confirmation] = screen.getAllByPlaceholderText("••••••••");
    fireEvent.changeText(password!, "Password2!x");
    fireEvent.changeText(confirmation!, "Password2!x");
    fireEvent.press(screen.getAllByText("Update password").at(-1)!);

    await waitFor(() => expect(screen.getByText("Password updated.")).toBeTruthy());
    expect(mockReset).toHaveBeenCalledWith("opaque", "Password2!x");
  });

  it("does not call the API for a link without a token", () => {
    mockParams = {};
    render(<ResetPasswordScreen />);

    expect(mockValidate).not.toHaveBeenCalled();
    expect(screen.getByText("The link is incomplete or invalid.")).toBeTruthy();
    expect(screen.queryByText("New password")).toBeNull();
  });
});
