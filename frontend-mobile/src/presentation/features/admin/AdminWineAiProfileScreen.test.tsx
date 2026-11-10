import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, TextInput } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import { KeyboardAwareScrollView } from "@/presentation/components/ui/KeyboardAwareScrollView";
import { AdminWineAiProfileScreen } from "./AdminWineAiProfileScreen";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("expo-router", () => ({ useLocalSearchParams: () => ({}), useRouter: () => ({ back: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 20, bottom: 20 }) }));
jest.mock("@/presentation/hooks/queries/admin/useWineProfileEditor", () => ({
  useWineProfileEditor: () => ({
    wine: null, loading: false, loadError: false, profile: null, draft: { values: {} }, errors: {},
    dirty: false, busy: false, saving: false, generating: false,
    restore: jest.fn(), changeField: jest.fn(), confirmRegenerate: jest.fn(), requestLeave: jest.fn(),
    retry: jest.fn(), save: jest.fn(),
  }),
}));
jest.mock("@/presentation/navigation/guards", () => ({ RoleGuard: ({ children }: { children: unknown }) => children }));
jest.mock("@/presentation/features/wine/WineProfileEditor", () => ({ WineProfileEditor: () => null }));

function withPlatform(platform: "ios" | "android", run: () => void) {
  const original = Platform.OS;
  Object.defineProperty(Platform, "OS", { configurable: true, value: platform });
  try {
    run();
  } finally {
    Object.defineProperty(Platform, "OS", { configurable: true, value: original });
  }
}

function showKeyboard(subscribe: jest.SpyInstance) {
  act(() =>
    subscribe.mock.calls
      .filter(([name]) => name === "keyboardDidShow")
      .forEach(([, listener]) => (listener as (e: unknown) => void)({})),
  );
}

afterEach(() => jest.restoreAllMocks());

it("keeps the iOS Save footer above the keyboard and reveals the field above that footer", () => {
  withPlatform("ios", () => {
    const subscribe = jest.spyOn(Keyboard, "addListener");
    const screen = render(<AdminWineAiProfileScreen wineId="wine-1" onLeave={jest.fn()} />);
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe("padding");
    // The padding already moves the scroll above the keyboard, so it is not inset twice.
    expect(screen.UNSAFE_getByType(KeyboardAwareScrollView).props.automaticallyAdjustKeyboardInsets).toBe(false);
    const scroll = screen.UNSAFE_getByType(ScrollView).instance as unknown as ScrollView;
    const toKeyboard = jest.fn();
    Object.assign(scroll, { scrollResponderScrollNativeHandleToKeyboard: toKeyboard });
    const field = { measureInWindow: jest.fn() };
    jest.spyOn(TextInput.State, "currentlyFocusedInput").mockReturnValue(field as never);
    jest.spyOn(Keyboard, "isVisible").mockReturnValue(true);
    fireEvent(screen.getByTestId("profile-editor-footer"), "layout", { nativeEvent: { layout: { height: 70 } } });
    showKeyboard(subscribe);
    expect(toKeyboard).toHaveBeenCalledWith(field, 86, true);
  });
});

it("relies on the shared keyboard room on edge-to-edge Android", () => {
  withPlatform("android", () => {
    const subscribe = jest.spyOn(Keyboard, "addListener");
    const screen = render(<AdminWineAiProfileScreen wineId="wine-1" onLeave={jest.fn()} />);
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBeUndefined();
    const scroll = screen.UNSAFE_getByType(ScrollView).instance as unknown as ScrollView;
    const toKeyboard = jest.fn();
    Object.assign(scroll, { scrollResponderScrollNativeHandleToKeyboard: toKeyboard });
    jest.spyOn(TextInput.State, "currentlyFocusedInput").mockReturnValue({ measureInWindow: jest.fn() } as never);
    jest.spyOn(Keyboard, "isVisible").mockReturnValue(true);
    jest.spyOn(Keyboard, "metrics").mockReturnValue({ screenY: 500, screenX: 0, height: 300, width: 390 });
    showKeyboard(subscribe);
    expect(toKeyboard).not.toHaveBeenCalled();
    expect(screen.getByTestId("keyboard-space")).toHaveStyle({ height: 300 });
  });
});
