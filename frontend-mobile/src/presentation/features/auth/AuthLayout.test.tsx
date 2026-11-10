import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  type ScrollViewInstance,
} from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import { AuthLayout } from "./AuthLayout";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));
jest.mock("./VinnotBrand", () => ({ VinnotBrand: () => null }));

function withPlatform(platform: "ios" | "android", run: () => void) {
  const original = Platform.OS;
  Object.defineProperty(Platform, "OS", { configurable: true, value: platform });
  try {
    run();
  } finally {
    Object.defineProperty(Platform, "OS", { configurable: true, value: original });
  }
}

function renderLayout() {
  return render(
    <AuthLayout heroTitle="Create account" heroSubtitle="Join">
      <Text>Form</Text>
    </AuthLayout>,
  );
}

afterEach(() => jest.restoreAllMocks());

it("reserves keyboard room on edge-to-edge Android, reveals the last field and restores full height on hide", () => {
  withPlatform("android", () => {
    const subscribe = jest.spyOn(Keyboard, "addListener");
    const screen = renderLayout();
    // Edge-to-edge Android does not restore a KeyboardAvoidingView height, so it stays inert.
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBeUndefined();
    expect(screen.queryByTestId("auth-keyboard-space")).toBeNull();
    const scroll = screen.UNSAFE_getByType(ScrollView).instance as unknown as ScrollViewInstance;
    const scrollTo = jest.spyOn(scroll, "scrollTo").mockImplementation(() => undefined);
    scrollTo.mockClear();
    const confirmPassword = {
      measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) =>
        callback(24, 620, 320, 52),
    };
    jest.spyOn(TextInput.State, "currentlyFocusedInput").mockReturnValue(confirmPassword as never);
    jest.spyOn(Keyboard, "metrics").mockReturnValue({ screenY: 500, screenX: 0, height: 300, width: 390 });
    act(() => subscribe.mock.calls.filter(([event]) => event === "keyboardDidShow").forEach(([, listener]) => listener({} as never)));
    expect(screen.getByTestId("auth-keyboard-space")).toHaveStyle({ height: 300 });
    // Once the reserved room is laid out, the shared reveal scrolls the field above the keyboard.
    scrollTo.mockClear();
    fireEvent(screen.UNSAFE_getByType(ScrollView), "contentSizeChange", 390, 1400);
    expect(scrollTo).toHaveBeenCalledWith({ y: 192, animated: true });
    act(() => subscribe.mock.calls.filter(([event]) => event === "keyboardDidHide").forEach(([, listener]) => listener({} as never)));
    expect(screen.queryByTestId("auth-keyboard-space")).toBeNull();
    screen.unmount();
  });
});

it("keeps the iOS keyboard padding and leaves a visible field where it is", () => {
  withPlatform("ios", () => {
    const subscribe = jest.spyOn(Keyboard, "addListener");
    const screen = renderLayout();
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe("padding");
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.keyboardVerticalOffset).toBe(40);
    const scroll = screen.UNSAFE_getByType(ScrollView).instance as unknown as ScrollViewInstance;
    const scrollTo = jest.spyOn(scroll, "scrollTo").mockImplementation(() => undefined);
    scrollTo.mockClear();
    jest.spyOn(TextInput.State, "currentlyFocusedInput").mockReturnValue({
      measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) =>
        callback(24, 200, 320, 52),
    } as never);
    jest.spyOn(Keyboard, "metrics").mockReturnValue({ screenY: 500, screenX: 0, height: 300, width: 390 });
    act(() => subscribe.mock.calls.filter(([event]) => event === "keyboardDidShow").forEach(([, listener]) => listener({} as never)));
    expect(scrollTo).not.toHaveBeenCalled();
    screen.unmount();
  });
});
