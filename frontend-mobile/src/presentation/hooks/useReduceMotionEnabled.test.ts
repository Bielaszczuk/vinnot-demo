import { act, renderHook } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { useReduceMotionEnabled } from "./useReduceMotionEnabled";

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual("react-native-reanimated"),
  useReducedMotion: jest.fn(() => false),
}));

type MotionListener = (enabled: boolean) => void;

function listenForMotionChanges() {
  const listeners: MotionListener[] = [];
  const remove = jest.fn();
  jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation(((event: string, listener: MotionListener) => {
    if (event === "reduceMotionChanged") listeners.push(listener);
    return { remove };
  }) as typeof AccessibilityInfo.addEventListener);
  return { emit: (enabled: boolean) => listeners.forEach((listener) => listener(enabled)), remove };
}

afterEach(() => jest.restoreAllMocks());

it("starts from the system setting read at launch, so the first frame never animates", () => {
  listenForMotionChanges();
  jest.mocked(useReducedMotion).mockReturnValue(true);
  const { result } = renderHook(() => useReduceMotionEnabled());
  expect(result.current).toBe(true);
});

it("follows the system setting when the user changes it while the app runs", () => {
  const system = listenForMotionChanges();
  jest.mocked(useReducedMotion).mockReturnValue(false);
  const { result } = renderHook(() => useReduceMotionEnabled());
  expect(result.current).toBe(false);
  act(() => system.emit(true));
  expect(result.current).toBe(true);
  act(() => system.emit(false));
  expect(result.current).toBe(false);
});

it("stops listening when the component unmounts", () => {
  const system = listenForMotionChanges();
  const { unmount } = renderHook(() => useReduceMotionEnabled());
  unmount();
  expect(system.remove).toHaveBeenCalledTimes(1);
});
