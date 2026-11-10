/* global jest */
// Jest runs Worklets' web build (react-native-reanimated/jest/resolver), which has no UI
// runtime. Gesture Handler 3 asks for one on import, so tests get an empty holder.
jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
