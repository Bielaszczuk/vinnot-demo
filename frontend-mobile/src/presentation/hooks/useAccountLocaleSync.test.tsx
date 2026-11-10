import { act, renderHook } from "@testing-library/react-native";
import { usersService } from "@/application/services/users.service";
import { useAccountLocaleSync } from "./useAccountLocaleSync";

const fixture = {
  auth: { user: null as { id: string } | null, accessToken: null as string | null },
  ui: { language: "es-AR" as "es-AR" | "en-US" },
  hydrating: false,
};

jest.mock("@/presentation/store/auth.store", () => ({
  useAuthStore: (selector: (state: typeof fixture.auth) => unknown) => selector(fixture.auth),
}));
jest.mock("@/presentation/store/ui.store", () => ({
  useUiStore: (selector: (state: typeof fixture.ui) => unknown) => selector(fixture.ui),
  useUiHydrating: () => fixture.hydrating,
}));
jest.mock("@/application/services/users.service", () => ({
  usersService: { syncAccountLocale: jest.fn(), deviceTimezone: jest.fn() },
}));
const lifecycle = { onFocus: () => undefined as void };
jest.mock("@/application/services/applicationLifecycle.service", () => ({
  applicationLifecycleService: {
    subscribe: (handlers: { onFocus: () => void }) => {
      lifecycle.onFocus = handlers.onFocus;
      return () => undefined;
    },
  },
}));

const sync = usersService.syncAccountLocale as jest.MockedFunction<typeof usersService.syncAccountLocale>;
const deviceTimezone = usersService.deviceTimezone as jest.MockedFunction<typeof usersService.deviceTimezone>;

beforeEach(() => {
  jest.clearAllMocks();
  sync.mockResolvedValue(undefined);
  deviceTimezone.mockReturnValue("America/Argentina/Buenos_Aires");
  fixture.auth = { user: null, accessToken: null };
  fixture.ui = { language: "es-AR" };
  fixture.hydrating = false;
});

it("does not sync without a session", () => {
  renderHook(useAccountLocaleSync);

  expect(sync).not.toHaveBeenCalled();
});

it("waits for the persisted language before the first sync", () => {
  fixture.auth = { user: { id: "user-1" }, accessToken: "access" };
  fixture.hydrating = true;
  const view = renderHook(useAccountLocaleSync);
  expect(sync).not.toHaveBeenCalled();

  fixture.hydrating = false;
  fixture.ui = { language: "en-US" };
  view.rerender({});

  expect(sync).toHaveBeenCalledTimes(1);
  expect(sync).toHaveBeenCalledWith("en-US");
});

it("syncs after login and again only when the language changes", () => {
  const view = renderHook(useAccountLocaleSync);
  fixture.auth = { user: { id: "user-1" }, accessToken: "access" };
  view.rerender({});
  view.rerender({});
  expect(sync).toHaveBeenCalledTimes(1);
  expect(sync).toHaveBeenLastCalledWith("es-AR");

  fixture.ui = { language: "en-US" };
  view.rerender({});

  expect(sync).toHaveBeenCalledTimes(2);
  expect(sync).toHaveBeenLastCalledWith("en-US");
});

it("syncs again after signing out and back in", () => {
  fixture.auth = { user: { id: "user-1" }, accessToken: "access" };
  const view = renderHook(useAccountLocaleSync);
  fixture.auth = { user: null, accessToken: null };
  view.rerender({});
  fixture.auth = { user: { id: "user-1" }, accessToken: "access" };
  view.rerender({});

  expect(sync).toHaveBeenCalledTimes(2);
});

it("swallows sync failures so login and language switching keep working", async () => {
  sync.mockRejectedValue(new Error("offline"));
  fixture.auth = { user: { id: "user-1" }, accessToken: "access" };

  const view = renderHook(useAccountLocaleSync);
  await Promise.resolve();

  expect(view.result.current).toBeUndefined();
  expect(sync).toHaveBeenCalledTimes(1);
});

it("syncs again when the device time zone changed while the app was in the background", () => {
  fixture.auth = { user: { id: "user-1" }, accessToken: "access" };
  renderHook(useAccountLocaleSync);
  expect(sync).toHaveBeenCalledTimes(1);

  act(() => lifecycle.onFocus());
  expect(sync).toHaveBeenCalledTimes(1);

  deviceTimezone.mockReturnValue("Europe/Madrid");
  act(() => lifecycle.onFocus());

  expect(sync).toHaveBeenCalledTimes(2);
  expect(sync).toHaveBeenLastCalledWith("es-AR");
});
