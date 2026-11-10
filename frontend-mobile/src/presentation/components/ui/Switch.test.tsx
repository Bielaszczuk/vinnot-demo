import { fireEvent, render, screen } from "@testing-library/react-native";
import { Switch as NativeSwitch } from "react-native";
import { Switch, ToggleRow } from "./Switch";
import { lightTokens } from "@/shared/theme/tokens";

it("paints the native switch with the brand colours", () => {
  const onValueChange = jest.fn();
  render(<Switch value onValueChange={onValueChange} accessibilityLabel="Push" />);
  const control = screen.UNSAFE_getByType(NativeSwitch);
  expect(control.props.trackColor).toEqual({ false: lightTokens.borderStrong, true: lightTokens.brandPrimary });
  expect(control.props.thumbColor).toBe(lightTokens.surfaceDefault);
  expect(control.props.ios_backgroundColor).toBe(lightTokens.borderStrong);
  fireEvent(control, "valueChange", false);
  expect(onValueChange).toHaveBeenCalledWith(false);
});

it("lets a row toggle from its label and exposes it as one switch", () => {
  const onValueChange = jest.fn();
  render(<ToggleRow label="Event reminders" description="A day before" value={false} onValueChange={onValueChange} />);
  expect(screen.getByText("A day before")).toBeTruthy();
  const row = screen.getByRole("switch", { name: "Event reminders" });
  expect(row.props.accessibilityState).toMatchObject({ checked: false, disabled: false });
  fireEvent.press(row);
  expect(onValueChange).toHaveBeenCalledWith(true);
});

it("ignores presses while disabled and hides the inner switch from assistive technology", () => {
  const onValueChange = jest.fn();
  render(<ToggleRow label="Sales" value onValueChange={onValueChange} disabled />);
  const row = screen.getByRole("switch", { name: "Sales" });
  expect(row.props.accessibilityState).toMatchObject({ checked: true, disabled: true });
  fireEvent.press(row);
  expect(onValueChange).not.toHaveBeenCalled();
  const inner = screen.UNSAFE_getByType(NativeSwitch);
  expect(inner.props.disabled).toBe(true);
  expect(inner.props.importantForAccessibility).toBe("no-hide-descendants");
});
