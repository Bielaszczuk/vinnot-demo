import React from "react";
import { render, act } from "@testing-library/react-native";
import RootLayout from "../../../../../app/_layout";
import RootIndex from "../../../../../app/index";

let mockFontsLoaded = false;
let mockFontError: Error | null = null;
let mockInitializing = true;
let mockAuthenticated = false;
let mockNavigationReady = true;
const mockBootstrap = jest.fn();
const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace };

// Push registration needs the Redux store and has its own tests.
jest.mock("@/presentation/navigation/PushNotificationsSync", () => ({ PushNotificationsSync: () => null }));
jest.mock("expo-font", () => ({ useFonts: () => [mockFontsLoaded, mockFontError] }));
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));
jest.mock("@/shared/styles/global.css", () => ({}));
jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const Stack = ({ children }: { children: React.ReactNode }) =>
    React.createElement("View", { testID: "navigation" }, children);
  Stack.Screen = ({ name }: { name: string }) =>
    React.createElement("View", { testID: `route-${name}` });
  Stack.Protected = ({ guard, children }: { guard: boolean; children: React.ReactNode }) =>
    guard ? children : null;
  return {
    Stack,
    useRouter: () => mockRouter,
    useFocusEffect: (callback: () => void) => {
      const ready = mockNavigationReady;
      React.useEffect(() => {
        if (ready) return callback();
      }, [callback, ready]);
    },
  };
});
jest.mock("@/presentation/providers/AppProviders", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    AppProviders: ({ children }: { children: React.ReactNode }) => {
      React.useEffect(() => {
        mockBootstrap();
      }, []);
      return children;
    },
  };
});
jest.mock("@/presentation/features/auth", () => ({ VinnotLaunchScreen: () => null }));
// The version gate has its own tests; here it only marks where it wraps the navigator.
jest.mock("@/presentation/features/appUpdate/AppUpdateGate", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    AppUpdateGate: ({ children }: { children: React.ReactNode }) =>
      React.createElement("View", { testID: "app-update-gate" }, children),
  };
});
jest.mock("@/presentation/store/auth.store", () => ({
  selectIsInitializing: (state: { initializing: boolean }) => state.initializing,
  selectIsAuthenticated: (state: { authenticated: boolean }) => state.authenticated,
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ initializing: mockInitializing, authenticated: mockAuthenticated }),
}));

describe("startup ordering and access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFontsLoaded = false;
    mockFontError = null;
    mockInitializing = true;
    mockAuthenticated = false;
    mockNavigationReady = true;
  });

  it("starts session providers while fonts are pending without mounting navigation", () => {
    const screen = render(<RootLayout />);
    expect(mockBootstrap).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("navigation")).toBeNull();
    mockFontsLoaded = true;
    screen.rerender(<RootLayout />);
    expect(screen.getByTestId("navigation")).toBeTruthy();
    expect(screen.getByTestId("app-update-gate")).toContainElement(screen.getByTestId("navigation"));
    expect(mockBootstrap).toHaveBeenCalledTimes(1);
  });

  it("allows navigation with fallback fonts after a font failure without restarting providers", () => {
    const screen = render(<RootLayout />);
    mockFontError = new Error("Font unavailable");
    screen.rerender(<RootLayout />);
    expect(screen.getByTestId("navigation")).toBeTruthy();
    expect(mockBootstrap).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    "waits for session restoration then navigates immediately (authenticated=%s)",
    (authenticated) => {
      jest.useFakeTimers();
      try {
        mockAuthenticated = authenticated;
        const screen = render(<RootIndex />);
        act(() => {
          jest.advanceTimersByTime(5000);
        });
        expect(mockReplace).not.toHaveBeenCalled();
        mockInitializing = false;
        screen.rerender(<RootIndex />);
        expect(mockReplace).toHaveBeenCalledTimes(1);
        expect(mockReplace).toHaveBeenCalledWith(
          authenticated ? "/(app)/(tabs)/home" : "/(onboarding)/welcome",
        );
        screen.unmount();
        act(() => {
          jest.runOnlyPendingTimers();
        });
        expect(mockReplace).toHaveBeenCalledTimes(1);
      } finally {
        jest.useRealTimers();
      }
    },
  );

  it("waits for navigation readiness when session restoration has already finished", () => {
    mockInitializing = false;
    mockNavigationReady = false;
    const screen = render(<RootIndex />);
    expect(mockReplace).not.toHaveBeenCalled();
    mockNavigationReady = true;
    screen.rerender(<RootIndex />);
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/(onboarding)/welcome");
  });
});

it("removes welcome from the navigator as soon as a session is established, restoring it only after logout", () => {
  mockFontsLoaded = true;
  mockInitializing = false;
  mockAuthenticated = false;
  const screen = render(<RootLayout />);
  expect(screen.getByTestId("route-(onboarding)")).toBeTruthy();
  mockAuthenticated = true;
  screen.rerender(<RootLayout />);
  expect(screen.queryByTestId("route-(onboarding)")).toBeNull();
  expect(screen.getByTestId("route-(app)")).toBeTruthy();
  expect(screen.getByTestId("route-(auth)")).toBeTruthy();
  mockAuthenticated = false;
  screen.rerender(<RootLayout />);
  expect(screen.getByTestId("route-(onboarding)")).toBeTruthy();
});
