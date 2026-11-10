import { act, renderHook, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { pushNotificationsService, type PushTap } from "@/application/services/pushNotifications.service";
import { usePushNotificationsSync } from "./usePushNotificationsSync";

const mockRememberReturnPath = jest.fn();
const mockClearReturnPath = jest.fn();
const fixture = {
  auth: {
    user: null as { id: string } | null,
    accessToken: null as string | null,
    isInitializing: false,
    rememberReturnPath: (path: string) => mockRememberReturnPath(path),
    clearReturnPath: () => mockClearReturnPath(),
  },
  ui: { language: "es-AR" as "es-AR" | "en-US" },
  hydrating: false,
  navigation: { key: "root" } as { key?: string } | undefined,
};
const mockChannels = [{ id: "default", importance: "default", name: "Vinnot", description: "Otros avisos" }];

jest.mock("expo-router", () => ({ router: { push: jest.fn() }, useRootNavigationState: () => fixture.navigation }));
jest.mock("@/presentation/features/notifications/usePushChannels", () => ({ usePushChannels: () => mockChannels }));
jest.mock("@/presentation/store/auth.store", () => ({
  useAuthStore: (selector: (state: typeof fixture.auth) => unknown) => selector(fixture.auth),
}));
jest.mock("@/presentation/store/ui.store", () => ({
  useUiStore: (selector: (state: typeof fixture.ui) => unknown) => selector(fixture.ui),
  useUiHydrating: () => fixture.hydrating,
}));
const listeners = { tap: (_tap: PushTap) => undefined as void, rotation: () => undefined as void, focus: () => undefined as void };
jest.mock("@/application/services/applicationLifecycle.service", () => ({
  applicationLifecycleService: {
    subscribe: (handlers: { onFocus: () => void }) => {
      listeners.focus = handlers.onFocus;
      return () => undefined;
    },
  },
}));
jest.mock("@/application/services/pushNotifications.service", () => ({
  pushNotificationsService: {
    register: jest.fn(),
    prepare: jest.fn(),
    forgetToken: jest.fn(),
    launchTap: jest.fn(),
    reportOpen: jest.fn(),
    onOpen: (listener: (tap: PushTap) => void) => {
      listeners.tap = listener;
      return () => undefined;
    },
    onTokenChange: (listener: () => void) => {
      listeners.rotation = listener;
      return () => undefined;
    },
  },
}));

const service = pushNotificationsService as jest.Mocked<typeof pushNotificationsService>;
const signedIn = () => ({ ...fixture.auth, user: { id: "u1" }, accessToken: "access", isInitializing: false });
const tap = (route: string | null, ref?: string): PushTap => ({
  route,
  open: ref ? { ref, type: "TASTE_PICK" } : null,
});

beforeEach(() => {
  jest.clearAllMocks();
  service.register.mockResolvedValue("ExponentPushToken[abc]");
  service.prepare.mockResolvedValue(true);
  service.launchTap.mockResolvedValue(null);
  fixture.auth = { ...fixture.auth, user: null, accessToken: null, isInitializing: false };
  fixture.ui = { language: "es-AR" };
  fixture.hydrating = false;
  fixture.navigation = { key: "root" };
});

it("registers nothing while signed out and forgets the token", () => {
  renderHook(usePushNotificationsSync);

  expect(service.register).not.toHaveBeenCalled();
  expect(service.forgetToken).toHaveBeenCalled();
});

it("creates the notification channels at startup, signed in or not, and renames them on a language switch", async () => {
  fixture.hydrating = true;
  const view = renderHook(usePushNotificationsSync);
  expect(service.prepare).not.toHaveBeenCalled();

  fixture.hydrating = false;
  view.rerender({});
  await waitFor(() => expect(service.prepare).toHaveBeenCalledWith(mockChannels));
  view.rerender({});
  expect(service.prepare).toHaveBeenCalledTimes(1);
});

it("registers after sign-in once the language is known, and again on a language switch or token rotation", async () => {
  fixture.auth = signedIn();
  fixture.hydrating = true;
  const view = renderHook(usePushNotificationsSync);
  expect(service.register).not.toHaveBeenCalled();

  fixture.hydrating = false;
  view.rerender({});
  expect(service.register).toHaveBeenCalledWith("es-AR", mockChannels);

  view.rerender({});
  expect(service.register).toHaveBeenCalledTimes(1);

  fixture.ui = { language: "en-US" };
  view.rerender({});
  expect(service.register).toHaveBeenLastCalledWith("en-US", mockChannels);

  act(() => listeners.rotation());
  expect(service.register).toHaveBeenCalledTimes(3);
  await waitFor(() => expect(service.launchTap).toHaveBeenCalledTimes(1));
});

it("registers again on every cold start even when nothing changed, keeping the device active", () => {
  fixture.auth = signedIn();
  renderHook(usePushNotificationsSync).unmount();
  renderHook(usePushNotificationsSync);

  expect(service.register).toHaveBeenCalledTimes(2);
});

it("returning to the app retries only while the device is not registered", async () => {
  fixture.auth = signedIn();
  service.register.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(null);
  renderHook(usePushNotificationsSync);
  await waitFor(() => expect(service.register).toHaveBeenCalledTimes(1));

  await act(async () => listeners.focus());
  expect(service.register).toHaveBeenCalledTimes(2);
  await act(async () => listeners.focus());
  expect(service.register).toHaveBeenCalledTimes(3);
  await act(async () => listeners.focus());
  expect(service.register).toHaveBeenCalledTimes(3);
});

it("opens the screen of a tapped notification and of the one that launched the app, and reports both opens", async () => {
  fixture.auth = signedIn();
  service.launchTap.mockResolvedValue(tap("/events/e1", "reminder:e1"));
  renderHook(usePushNotificationsSync);

  await waitFor(() => expect(router.push).toHaveBeenCalledWith("/events/e1"));
  expect(service.reportOpen).toHaveBeenCalledWith({ ref: "reminder:e1", type: "TASTE_PICK" });
  act(() => listeners.tap(tap("/my-tickets/r1", "ticket:r1")));
  expect(router.push).toHaveBeenLastCalledWith("/my-tickets/r1");
  expect(service.reportOpen).toHaveBeenLastCalledWith({ ref: "ticket:r1", type: "TASTE_PICK" });
});

it("reports the open of a push that carries no in-app screen, and opens older pushes without reporting", () => {
  fixture.auth = signedIn();
  renderHook(usePushNotificationsSync);

  act(() => listeners.tap(tap(null, "news:1")));
  expect(service.reportOpen).toHaveBeenCalledTimes(1);
  expect(router.push).not.toHaveBeenCalled();

  act(() => listeners.tap(tap("/wines/w1")));
  expect(router.push).toHaveBeenCalledWith("/wines/w1");
  expect(service.reportOpen).toHaveBeenCalledTimes(1);
});

it("a tap while signed out does not navigate: the screen opens after the login, and the open is reported then", () => {
  const view = renderHook(usePushNotificationsSync);

  act(() => listeners.tap(tap("/wines/w1", "taste:1")));

  expect(router.push).not.toHaveBeenCalled();
  expect(service.reportOpen).not.toHaveBeenCalled();
  expect(mockClearReturnPath).toHaveBeenCalledTimes(1);
  expect(mockRememberReturnPath).toHaveBeenCalledWith("/wines/w1");

  fixture.auth = signedIn();
  view.rerender({});

  expect(service.reportOpen).toHaveBeenCalledWith({ ref: "taste:1", type: "TASTE_PICK" });
  expect(router.push).not.toHaveBeenCalled();
});

it("a tap without anything to open or report while signed out leaves the login alone", () => {
  renderHook(usePushNotificationsSync);

  act(() => listeners.tap(tap(null)));

  expect(mockRememberReturnPath).not.toHaveBeenCalled();
});

it("a launch notification waits for the navigation and the session before opening its screen", async () => {
  fixture.navigation = undefined;
  fixture.auth = { ...signedIn(), isInitializing: true };
  service.launchTap.mockResolvedValue(tap("/events/e1"));
  const view = renderHook(usePushNotificationsSync);
  await waitFor(() => expect(service.launchTap).toHaveBeenCalledTimes(1));
  await act(async () => undefined);
  expect(router.push).not.toHaveBeenCalled();

  fixture.navigation = { key: "root" };
  view.rerender({});
  expect(router.push).not.toHaveBeenCalled();

  fixture.auth = signedIn();
  view.rerender({});
  expect(router.push).toHaveBeenCalledWith("/events/e1");
  view.rerender({});
  expect(router.push).toHaveBeenCalledTimes(1);
});

it("an unreadable launch notification just opens the app", async () => {
  fixture.auth = signedIn();
  service.launchTap.mockRejectedValue(new Error("unavailable"));
  renderHook(usePushNotificationsSync);

  await waitFor(() => expect(service.launchTap).toHaveBeenCalled());
  expect(router.push).not.toHaveBeenCalled();
});

it("channels that cannot be created never break the app", async () => {
  service.prepare.mockRejectedValue(new Error("unavailable"));
  renderHook(usePushNotificationsSync);

  await waitFor(() => expect(service.prepare).toHaveBeenCalled());
  expect(service.register).not.toHaveBeenCalled();
});
