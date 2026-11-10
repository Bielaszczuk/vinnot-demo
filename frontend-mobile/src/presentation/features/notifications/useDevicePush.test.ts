import { act, renderHook, waitFor } from "@testing-library/react-native";
import { applicationLifecycleService } from "@/application/services/applicationLifecycle.service";
import { pushNotificationsService } from "@/application/services/pushNotifications.service";
import { useDevicePush } from "./useDevicePush";

const mockChannels = [{ id: "default", importance: "default", name: "Vinnot", description: "Otros avisos" }];
jest.mock("./usePushChannels", () => ({ usePushChannels: () => mockChannels }));
jest.mock("@/presentation/store/ui.store", () => ({
  useUiStore: (selector: (state: { language: string }) => unknown) => selector({ language: "es-AR" }),
}));
jest.mock("@/application/services/pushNotifications.service", () => ({
  pushNotificationsService: { deviceStatus: jest.fn(), enableOnThisDevice: jest.fn(), openNotificationSettings: jest.fn() },
}));
jest.mock("@/application/services/applicationLifecycle.service", () => ({
  applicationLifecycleService: { subscribe: jest.fn() },
}));

const service = pushNotificationsService as jest.Mocked<typeof pushNotificationsService>;
const lifecycle = applicationLifecycleService as jest.Mocked<typeof applicationLifecycleService>;
let focus: () => void = () => undefined;
const unsubscribe = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  service.deviceStatus.mockResolvedValue("undetermined");
  lifecycle.subscribe.mockImplementation((handlers) => {
    focus = handlers.onFocus;
    return unsubscribe;
  });
});

it("reads the device status only while visible and again when the app comes back", async () => {
  const hook = renderHook(({ open }) => useDevicePush(open), { initialProps: { open: false } });
  expect(service.deviceStatus).not.toHaveBeenCalled();
  expect(hook.result.current.status).toBeNull();

  hook.rerender({ open: true });
  await waitFor(() => expect(hook.result.current.status).toBe("undetermined"));

  service.deviceStatus.mockResolvedValue("granted");
  act(() => focus());
  await waitFor(() => expect(hook.result.current.status).toBe("granted"));

  hook.rerender({ open: false });
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});

it("turns push on for this device in the app language and keeps the result", async () => {
  service.enableOnThisDevice.mockResolvedValue("granted");
  const hook = renderHook(() => useDevicePush(true));
  await waitFor(() => expect(hook.result.current.status).toBe("undetermined"));

  act(() => hook.result.current.enable());
  expect(hook.result.current.busy).toBe(true);
  await waitFor(() => expect(hook.result.current.busy).toBe(false));

  expect(service.enableOnThisDevice).toHaveBeenCalledWith("es-AR", mockChannels);
  expect(hook.result.current.status).toBe("granted");
});

it("ignores a second tap while enabling and survives a failed registration", async () => {
  let fail: (error: Error) => void = () => undefined;
  service.enableOnThisDevice.mockReturnValue(new Promise((_, reject) => { fail = reject; }));
  const hook = renderHook(() => useDevicePush(true));
  await waitFor(() => expect(hook.result.current.status).toBe("undetermined"));

  act(() => hook.result.current.enable());
  act(() => hook.result.current.enable());
  await act(async () => fail(new Error("offline")));

  expect(service.enableOnThisDevice).toHaveBeenCalledTimes(1);
  expect(hook.result.current.busy).toBe(false);
  expect(hook.result.current.status).toBe("undetermined");
});

it("opens this app's notification settings", async () => {
  const open = service.openNotificationSettings;
  open.mockResolvedValue(undefined);
  const hook = renderHook(() => useDevicePush(true));
  await waitFor(() => expect(hook.result.current.status).toBe("undetermined"));

  act(() => hook.result.current.openSettings());

  expect(open).toHaveBeenCalledTimes(1);
});
