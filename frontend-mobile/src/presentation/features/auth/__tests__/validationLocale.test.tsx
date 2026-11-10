import React from "react";
import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import i18n from "@/shared/i18n";
import { AUTH_ERROR_MESSAGES } from "@/domain/user/auth.messages";
import { loginUserSchema, type LoginUserInput } from "@/domain/user/user.validators";
import { LoginScreenView } from "../LoginScreenView";

jest.mock("expo-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

function Harness({ serverError }: { serverError: string | null }) {
  const { control, handleSubmit, formState } = useForm<LoginUserInput>({
    resolver: zodResolver(loginUserSchema),
    defaultValues: { email: "", password: "" },
  });
  return (
    <LoginScreenView
      control={control}
      errors={formState.errors}
      isSubmitting={false}
      busyProvider={null}
      serverError={serverError}
      onSubmit={handleSubmit(() => undefined)}
      onSocial={() => undefined}
      onForgotPassword={() => undefined}
    />
  );
}

describe("login validation locale", () => {
  const previous = i18n.language;
  beforeAll(async () => {
    await i18n.changeLanguage("en-US");
  });
  afterAll(async () => {
    await i18n.changeLanguage(previous);
  });

  it("renders English validation and session messages for en-US users", async () => {
    render(<Harness serverError={AUTH_ERROR_MESSAGES.sessionExpired} />);
    await act(async () => {
      fireEvent.press(screen.getAllByText("Sign in").at(-1)!);
    });
    expect(screen.getByText("Enter your email or username")).toBeTruthy();
    expect(screen.getByText("Enter your password.")).toBeTruthy();
    expect(screen.getByText("Your session has expired. Please sign in again.")).toBeTruthy();
    expect(screen.queryByText(/Ingresá/)).toBeNull();
  });

  it("still shows server-provided text unchanged", () => {
    render(<Harness serverError="El email ya está registrado" />);
    expect(screen.getByText("El email ya está registrado")).toBeTruthy();
  });
});
