import React from "react";
import { Button, Text } from "react-native";
import { act, fireEvent, renderRouter, screen } from "expo-router/testing-library";
import { router, Stack } from "expo-router";
import { RootNavigator } from "./RootNavigator";

let mockSession = { authenticated: false, initializing: false };
const mockListeners = new Set<() => void>();
// Push registration needs the Redux store and has its own tests.
jest.mock("@/presentation/navigation/PushNotificationsSync", () => ({ PushNotificationsSync: () => null }));
jest.mock("@/presentation/navigation/ActivitySync", () => ({ ActivitySync: () => null }));
jest.mock("@/presentation/store/auth.store", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    selectIsAuthenticated: (state: typeof mockSession) => state.authenticated,
    selectIsInitializing: (state: typeof mockSession) => state.initializing,
    useAuthStore: (selector: (state: typeof mockSession) => boolean) =>
      selector(
        React.useSyncExternalStore(
          (listener) => {
            mockListeners.add(listener);
            return () => {
              mockListeners.delete(listener);
            };
          },
          () => mockSession,
        ),
      ),
  };
});
function authenticate() {
  mockSession = { authenticated: true, initializing: false };
  mockListeners.forEach((listener) => listener());
  router.replace("/(app)/(tabs)/home");
}

it("removes the welcome entry from real Router history after login while preserving detail Back", async () => {
  renderRouter(
    {
      _layout: RootNavigator,
      "(onboarding)/_layout": () => <Stack />,
      "(auth)/_layout": () => <Stack />,
      "(app)/_layout": () => <Stack />,
      index: () => <Text>Root</Text>,
      "(onboarding)/welcome": () => (
        <Button title="Log in" onPress={() => router.push("/(auth)/login")} />
      ),
      "(auth)/login": () => <Button title="Authenticate" onPress={authenticate} />,
      "(app)/(tabs)/home": () => (
        <Button title="Open detail" onPress={() => router.push("/(app)/cellar")} />
      ),
      "(app)/cellar": () => <Text>Detail</Text>,
      "403": () => null,
      "+not-found": () => null,
    },
    { initialUrl: "/welcome" },
  );
  fireEvent.press(screen.getByText("Log in"));
  fireEvent.press(await screen.findByText("Authenticate"));
  expect(await screen.findByText("Open detail")).toBeTruthy();
  // A previous welcome route must not remain reachable after replacement.
  expect(router.canGoBack()).toBe(false);
  fireEvent.press(screen.getByText("Open detail"));
  expect(await screen.findByText("Detail")).toBeTruthy();
  act(() => router.back());
  expect(await screen.findByText("Open detail")).toBeTruthy();
  expect(mockSession.authenticated).toBe(true);
});
