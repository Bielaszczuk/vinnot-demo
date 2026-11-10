import { render, screen } from "@testing-library/react-native";
import { Image, StyleSheet } from "react-native";
import { cancelAnimation, useReducedMotion, withRepeat, withTiming } from "react-native-reanimated";
import { WineGlassMark } from "./WineGlassMark";

jest.mock("react-native-reanimated", () => {
  const { View } = jest.requireActual("react-native") as typeof import("react-native");
  return {
    __esModule: true, default: { View },
    cancelAnimation: jest.fn(), Easing: { linear: (value: number) => value },
    Extrapolation: { CLAMP: "clamp" }, interpolate: () => 0,
    useReducedMotion: jest.fn(() => false), useSharedValue: () => ({ value: 0 }),
    useAnimatedStyle: () => ({}), withRepeat: jest.fn(value => value), withTiming: jest.fn(() => 1),
  };
});
beforeEach(() => { jest.clearAllMocks(); jest.mocked(useReducedMotion).mockReturnValue(false); });

it("runs a bounded paint cycle and cancels it when the loading mark leaves", () => {
  const view = render(<WineGlassMark animated />);
  expect(screen.getByRole("image", { name: "Vinnot" })).toBeTruthy();
  expect(withTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: 3400 }));
  expect(withRepeat).toHaveBeenCalledWith(expect.anything(), -1, false);
  view.unmount(); expect(cancelAnimation).toHaveBeenCalled();
});
it("uses one fully colored static mark when reduced motion is enabled", () => {
  jest.mocked(useReducedMotion).mockReturnValue(true);
  render(<WineGlassMark animated color="#9b1c3d" />);
  expect(withRepeat).not.toHaveBeenCalled();
  const images = screen.UNSAFE_getAllByType(Image);
  expect(images).toHaveLength(1);
  expect(StyleSheet.flatten(images[0]!.props.style)).toMatchObject({ opacity: 1, tintColor: "#9b1c3d" });
});
