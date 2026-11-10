import React from "react";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { ScrollView, StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import WelcomeScreen from "../../../../../app/(onboarding)/welcome";

const mockPush = jest.fn();
const mockSetOnboardingDone = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("expo-image", () => ({ Image: "Image" }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("@/presentation/store/ui.store", () => ({
  useUiStore: (selector: (state: { setOnboardingDone: () => void }) => unknown) =>
    selector({ setOnboardingDone: mockSetOnboardingDone }),
}));
jest.mock("@/presentation/features/auth", () => {
  const { Pressable, Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    AuthButton: ({ children, onPress }: { children: string; onPress: () => void }) => (
      <Pressable accessibilityRole="button" onPress={onPress}><Text>{children}</Text></Pressable>
    ),
    VinnotBrand: () => null,
    authColors: { background: "#fff", ink: "#111", muted: "#666" },
    authFonts: { semibold: "Semibold", regular: "Regular" },
  };
});

describe("welcome route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("scrolls at the largest Dynamic Type and lets its copy scale with the system font", () => {
    const screen = render(<WelcomeScreen />);
    const scroll = screen.UNSAFE_getByType(ScrollView);
    const content = StyleSheet.flatten(scroll.props.contentContainerStyle);
    expect(content).toMatchObject({ flexGrow: 1, paddingTop: 69, paddingBottom: 56 });
    for (const key of ["onboarding.choiceTitle", "onboarding.choiceSubtitle"]) {
      const text = screen.getByText(key);
      expect(text.props.allowFontScaling).not.toBe(false);
      expect(text.props.maxFontSizeMultiplier).toBeUndefined();
      expect(text.props.numberOfLines).toBeUndefined();
    }
    expect(screen.getByText("auth.signIn")).toBeTruthy();
  });

  it("still completes onboarding before opening sign in or registration", () => {
    const screen = render(<WelcomeScreen />);
    fireEvent.press(screen.getByText("auth.signIn"));
    expect(mockSetOnboardingDone).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenLastCalledWith("/(auth)/login");
    fireEvent.press(screen.getByText("auth.createAccount"));
    expect(mockPush).toHaveBeenLastCalledWith("/(auth)/register");
  });
});
