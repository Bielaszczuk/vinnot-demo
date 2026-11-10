import { act, renderHook, waitFor } from "@testing-library/react-native";
import { pushNotificationsService } from "@/application/services/pushNotifications.service";
import { useLaunchPushPrompt } from "./useLaunchPushPrompt";

const fixture = {
  auth: { user: null as { id: string } | null, accessToken: null as string | null, isInitializing: false },
  hydrating: false,
};
const mockChannels = [{ id: "default", importance: "default", name: "Vinnot", description: "Otros avisos" }];

jest.mock("@/presentation/store/auth.store", () => ({
  useAuthStore: (selector: (state: typeof fixture.auth) => unknown) => selector(fixture.auth),
}));
jest.mock("@/presentation/store/ui.store", () => ({
  useUiStore: (selector: (state: { language: string }) => unknown) => selector({ language: "es-AR" }),
  useUiHydrating: () => fixture.hydrating,
}));
jest.mock("./usePushChannels", () => ({ usePushChannels: () => mockChannels }));
jest.mock("@/application/services/pushNotifications.service", () => ({
  pushNotificationsService: { launchPrompt: jest.fn(), allowFromPrompt: jest.fn(), openNotificationSettings: jest.fn() },
}));

const service = pushNotificationsService as jest.Mocked<typeof pushNotificationsService>;

beforeEach(() => {
  jest.clearAllMocks();
  fixture.auth = { user: { id: "u1" }, accessToken: "access", isInitializing: false };
  fixture.hydrating = false;
  service.launchPrompt.mockResolvedValue(null);
  service.allowFromPrompt.mockResolvedValue(true);
});

it("waits for the stored settings and the session before deciding, then shows the launch sheet", async () => {
  fixture.hydrating = true;
  fixture.auth.isInitializing = true;
  service.launchPrompt.mockResolvedValue("intro");
  const view = renderHook(useLaunchPushPrompt);
  expect(service.launchPrompt).not.toHaveBeenCalled();

  fixture.hydrating = false;
  fixture.auth.isInitializing = false;
  view.rerender({});

  await waitFor(() => expect(view.result.current.visible).toBe(true));
  expect(service.launchPrompt).toHaveBeenCalledWith(true);
  expect(view.result.current.prompt).toBe("intro");
});

it("asks again once a visitor signs in (the service shows one sheet per launch)", async () => {
  fixture.auth = { user: null, accessToken: null, isInitializing: false };
  const view = renderHook(useLaunchPushPrompt);
  await waitFor(() => expect(service.launchPrompt).toHaveBeenCalledWith(false));
  expect(view.result.current.visible).toBe(false);

  service.launchPrompt.mockResolvedValue("enable");
  fixture.auth = { user: { id: "u1" }, accessToken: "access", isInitializing: false };
  view.rerender({});

  await waitFor(() => expect(view.result.current.prompt).toBe("enable"));
  expect(service.launchPrompt).toHaveBeenLastCalledWith(true);
});

it("allowing shows the system prompt through the service and closes the sheet", async () => {
  service.launchPrompt.mockResolvedValue("enable");
  const view = renderHook(useLaunchPushPrompt);
  await waitFor(() => expect(view.result.current.visible).toBe(true));

  act(() => view.result.current.allow());
  // The sheet closes at once, so the system prompt never sits on top of it.
  expect(view.result.current.visible).toBe(false);
  expect(view.result.current.busy).toBe(true);
  await waitFor(() => expect(view.result.current.busy).toBe(false));

  expect(service.allowFromPrompt).toHaveBeenCalledWith("es-AR", mockChannels, true);
  expect(view.result.current.visible).toBe(false);
  expect(view.result.current.prompt).toBe("enable");
});

it("a failed prompt still closes the sheet", async () => {
  service.launchPrompt.mockResolvedValue("intro");
  service.allowFromPrompt.mockRejectedValue(new Error("unavailable"));
  const view = renderHook(useLaunchPushPrompt);
  await waitFor(() => expect(view.result.current.visible).toBe(true));

  await act(async () => view.result.current.allow());

  expect(view.result.current.visible).toBe(false);
});

it("blocked notifications open this app's notification settings instead of a prompt", async () => {
  const open = service.openNotificationSettings;
  open.mockResolvedValue(undefined);
  service.launchPrompt.mockResolvedValue("settings");
  const view = renderHook(useLaunchPushPrompt);
  await waitFor(() => expect(view.result.current.visible).toBe(true));

  act(() => view.result.current.allow());

  expect(open).toHaveBeenCalledTimes(1);
  expect(service.allowFromPrompt).not.toHaveBeenCalled();
  expect(view.result.current.visible).toBe(false);
});

it("not now just closes the sheet, and an unreadable status shows nothing", async () => {
  service.launchPrompt.mockResolvedValue("intro");
  const view = renderHook(useLaunchPushPrompt);
  await waitFor(() => expect(view.result.current.visible).toBe(true));
  act(() => view.result.current.dismiss());
  expect(view.result.current.visible).toBe(false);

  service.launchPrompt.mockRejectedValue(new Error("unavailable"));
  const other = renderHook(useLaunchPushPrompt);
  await waitFor(() => expect(service.launchPrompt).toHaveBeenCalledTimes(2));
  expect(other.result.current.visible).toBe(false);
  expect(service.allowFromPrompt).not.toHaveBeenCalled();
});
