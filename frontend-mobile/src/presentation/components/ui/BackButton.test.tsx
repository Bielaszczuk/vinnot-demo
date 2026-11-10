import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { BackButton } from "./BackButton";
import { lightTokens } from "@/shared/theme/tokens";

const mockRouter = { canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

beforeEach(() => jest.clearAllMocks());

it("goes back when the screen has history", () => {
  mockRouter.canGoBack.mockReturnValue(true);
  render(<BackButton fallback="/(app)/wineries" />);
  fireEvent.press(screen.getByRole("button", { name: "common.back" }));
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

it("opens the fallback route when the screen was opened from a link", () => {
  mockRouter.canGoBack.mockReturnValue(false);
  render(<BackButton fallback="/(app)/wineries" />);
  fireEvent.press(screen.getByRole("button", { name: "common.back" }));
  expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/wineries");
});

it("falls back to Home when no fallback is given", () => {
  mockRouter.canGoBack.mockReturnValue(false);
  render(<BackButton />);
  fireEvent.press(screen.getByRole("button", { name: "common.back" }));
  expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/(tabs)/home");
});

it("lets a view model own the back behaviour", () => {
  const onPress = jest.fn();
  render(<BackButton onPress={onPress} />);
  fireEvent.press(screen.getByRole("button", { name: "common.back" }));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(mockRouter.back).not.toHaveBeenCalled();
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

it("tints the control while it is pressed", () => {
  render(<BackButton />);
  const button = screen.getByRole("button", { name: "common.back" });
  fireEvent(button, "pressIn");
  expect(StyleSheet.flatten(screen.getByRole("button", { name: "common.back" }).props.style).backgroundColor).toBe(
    lightTokens.brandSecondary,
  );
  fireEvent(button, "pressOut");
  expect(StyleSheet.flatten(screen.getByRole("button", { name: "common.back" }).props.style).backgroundColor).toBe(
    lightTokens.surfaceDefault,
  );
});

it("shows the label in the pill variant and only the icon in the icon variant, both 44 pt tall", () => {
  const { rerender } = render(<BackButton label="Wines" />);
  expect(screen.getByText("Wines")).toBeTruthy();
  const pill = StyleSheet.flatten(screen.getByRole("button", { name: "Wines" }).props.style);
  expect(pill.minHeight).toBeGreaterThanOrEqual(44);
  expect(pill.borderColor).toBe(lightTokens.borderSoft);

  rerender(<BackButton variant="icon" />);
  expect(screen.queryByText("common.back")).toBeNull();
  const icon = StyleSheet.flatten(screen.getByRole("button", { name: "common.back" }).props.style);
  expect(icon.width).toBeGreaterThanOrEqual(44);
  expect(icon.height).toBeGreaterThanOrEqual(44);
});

it("does nothing while disabled", () => {
  const onPress = jest.fn();
  render(<BackButton onPress={onPress} disabled />);
  const button = screen.getByRole("button", { name: "common.back" });
  expect(button.props.accessibilityState).toMatchObject({ disabled: true });
  fireEvent.press(button);
  expect(onPress).not.toHaveBeenCalled();
});
