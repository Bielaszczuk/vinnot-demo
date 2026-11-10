import { act, render, screen } from "@testing-library/react-native";
import { StatusBar } from "expo-status-bar";
import { FocusAwareStatusBar } from "./FocusAwareStatusBar";

let mockBlur: (() => void) | undefined;
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual<typeof import("react")>("react");
  return {
    useFocusEffect: (effect: () => (() => void) | undefined) =>
      useEffect(() => {
        mockBlur = effect();
      }, [effect]),
  };
});

it("sets the status bar style only while its screen is focused", () => {
  render(<FocusAwareStatusBar style="light" />);
  expect(screen.UNSAFE_getByType(StatusBar).props.style).toBe("light");
  act(() => mockBlur?.());
  expect(screen.UNSAFE_queryByType(StatusBar)).toBeNull();
});
