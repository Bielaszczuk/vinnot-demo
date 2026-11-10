/**
 * Test double for react-native-reanimated, for the profile art tests only:
 * `jest.mock("react-native-reanimated", () => jest.requireActual("./reanimatedMock").createReanimatedMock())`.
 * Animated styles are computed once at render, so a component shows its opening pose (progress 0)
 * or, with reduced motion, its finished pose (progress 1). Layout animations are inert; the rest is the real module.
 */
export function createReanimatedMock() {
  const React = jest.requireActual("react") as typeof import("react");
  const { View } = jest.requireActual("react-native") as typeof import("react-native");
  class Keyframe {
    constructor(readonly frames: unknown) {}
    duration() {
      return this;
    }
  }
  const actual = jest.requireActual("react-native-reanimated") as typeof import("react-native-reanimated");
  return {
    ...actual,
    __esModule: true,
    default: { ...actual.default, View },
    Keyframe,
    useReducedMotion: jest.fn(() => false),
    useSharedValue: (initial: number) => React.useRef({ value: initial }).current,
    useAnimatedStyle: (factory: () => object) => factory(),
    withTiming: jest.fn((value: number) => value),
  };
}
