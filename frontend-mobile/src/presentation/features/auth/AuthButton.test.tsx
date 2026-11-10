import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { AuthButton } from "./AuthButton";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

jest.mock("@/application/services/haptics.service", () => ({ hapticsService: { impact: jest.fn() } }));

it("is the shared large button, full width, with the brand fill", () => {
  const onPress = jest.fn();
  render(<AuthButton onPress={onPress}>Ingresar</AuthButton>);
  const button = screen.getByRole("button", { name: "Ingresar" });
  const surface = StyleSheet.flatten(button.props.style);
  expect(surface.backgroundColor).toBe(lightTokens.brandPrimary);
  expect(surface.borderRadius).toBe(radii.md);
  expect(surface.minHeight).toBe(56);
  expect(StyleSheet.flatten(screen.getByText("Ingresar").props.style).fontFamily).toBe(textStyles.button.fontFamily);
  fireEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});

it("keeps the outline variant and reports a busy state while loading", () => {
  render(<AuthButton variant="outline" loading onPress={jest.fn()}>Crear cuenta</AuthButton>);
  const button = screen.getByRole("button", { name: "Crear cuenta" });
  expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  expect(StyleSheet.flatten(button.props.style).borderColor).toBe(lightTokens.brandPrimary);
});
