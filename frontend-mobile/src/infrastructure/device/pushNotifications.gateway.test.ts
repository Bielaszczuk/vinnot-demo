import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";
import { pushNotificationsGateway } from "@/infrastructure/device/pushNotifications.gateway";

jest.mock("expo-device", () => ({ isDevice: true }));
jest.mock("expo-constants", () => ({ __esModule: true, default: { expoConfig: { android: { package: "com.vinnot.app" }, extra: { eas: { projectId: "project-1" } } } } }));
jest.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4, DEFAULT: 3, LOW: 2 },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addPushTokenListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponse: jest.fn(),
  clearLastNotificationResponse: jest.fn(),
}));

const notifications = Notifications as jest.Mocked<typeof Notifications>;
const response = (data: unknown) => ({ notification: { request: { content: { data } } } }) as never;
const channels = [
  { id: "tickets", importance: "high", name: "Entradas y cuenta", description: "Tus entradas" },
  { id: "news", importance: "low", name: "Novedades", description: "Destacados" },
  { id: "default", importance: "default", name: "Vinnot", description: "Otros avisos" },
] as const;

beforeEach(() => jest.clearAllMocks());

describe("pushNotificationsGateway", () => {
  it("reads the permission without prompting", async () => {
    notifications.getPermissionsAsync.mockResolvedValueOnce({ granted: true, canAskAgain: true } as never)
      .mockResolvedValueOnce({ granted: false, canAskAgain: true } as never)
      .mockResolvedValueOnce({ granted: false, canAskAgain: false } as never);

    await expect(pushNotificationsGateway.permission()).resolves.toBe("granted");
    await expect(pushNotificationsGateway.permission()).resolves.toBe("undetermined");
    await expect(pushNotificationsGateway.permission()).resolves.toBe("denied");
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("prompts on request", async () => {
    notifications.requestPermissionsAsync.mockResolvedValue({ granted: true } as never);

    await expect(pushNotificationsGateway.requestPermission()).resolves.toBe(true);
  });

  it("shows notifications in the foreground quietly and creates every Android channel with its importance", async () => {
    Platform.OS = "android";

    await expect(pushNotificationsGateway.prepare([...channels])).resolves.toBe(true);

    const handler = notifications.setNotificationHandler.mock.calls[0]![0]!;
    await expect(handler.handleNotification({} as never)).resolves.toEqual({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
    });
    expect(notifications.setNotificationChannelAsync.mock.calls).toEqual([
      ["tickets", { name: "Entradas y cuenta", description: "Tus entradas", importance: 4, lightColor: "#ab214c" }],
      ["news", { name: "Novedades", description: "Destacados", importance: 2, lightColor: "#ab214c" }],
      ["default", { name: "Vinnot", description: "Otros avisos", importance: 3, lightColor: "#ab214c" }],
    ]);
    expect(pushNotificationsGateway.platform()).toBe("ANDROID");
  });

  it("skips the channels on iOS and says none were created", async () => {
    Platform.OS = "ios";

    await expect(pushNotificationsGateway.prepare([...channels])).resolves.toBe(false);

    expect(notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
    expect(notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    expect(pushNotificationsGateway.platform()).toBe("IOS");
    expect(pushNotificationsGateway.isSupported()).toBe(true);
  });

  it("reads the Expo token for this project", async () => {
    notifications.getExpoPushTokenAsync.mockResolvedValue({ data: "ExponentPushToken[abc]", type: "expo" });

    await expect(pushNotificationsGateway.token()).resolves.toBe("ExponentPushToken[abc]");
    expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: "project-1" });
  });

  it("passes taps, launches and token rotations through", async () => {
    const remove = jest.fn();
    let onResponse: (value: never) => void = () => undefined;
    let onToken: (token: { data: string }) => void = () => undefined;
    notifications.addNotificationResponseReceivedListener.mockImplementation((listener) => {
      onResponse = listener as never;
      return { remove } as never;
    });
    notifications.addPushTokenListener.mockImplementation((listener) => {
      onToken = listener as never;
      return { remove } as never;
    });
    const launch = { url: "/events/e1", type: "EVENT_REMINDER", ref: "reminder:r1" };
    notifications.getLastNotificationResponse.mockReturnValueOnce(response(launch)).mockReturnValueOnce(null);
    const taps: unknown[] = [];
    const rotations = jest.fn();

    const stopOpen = pushNotificationsGateway.onOpen((data) => taps.push(data));
    const stopToken = pushNotificationsGateway.onTokenChange(rotations);
    onResponse(response({ url: "/my-tickets/r1", type: "EVENT_REGISTRATION_ATTENDEE", ref: "ticket:r1" }));
    onToken({ data: "device-a" });
    stopOpen();
    stopToken();

    expect(taps).toEqual([{ url: "/my-tickets/r1", type: "EVENT_REGISTRATION_ATTENDEE", ref: "ticket:r1" }]);
    expect(rotations).toHaveBeenCalledWith("device-a");
    expect(remove).toHaveBeenCalledTimes(2);
    expect(notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(1);
    await expect(pushNotificationsGateway.launchData()).resolves.toEqual(launch);
    expect(notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(2);
    await expect(pushNotificationsGateway.launchData()).resolves.toBeNull();
    expect(notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(2);
  });
});

describe("pushNotificationsGateway.openNotificationSettings", () => {
  const original = Platform.OS;
  afterEach(() => {
    Platform.OS = original;
    jest.restoreAllMocks();
  });

  it("opens Vinnot's notification settings directly on Android", async () => {
    Platform.OS = "android";
    const intent = jest.spyOn(Linking, "sendIntent").mockResolvedValue(undefined);
    const settings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);

    await pushNotificationsGateway.openNotificationSettings();

    expect(intent).toHaveBeenCalledWith("android.settings.APP_NOTIFICATION_SETTINGS", [
      { key: "android.provider.extra.APP_PACKAGE", value: "com.vinnot.app" },
    ]);
    expect(settings).not.toHaveBeenCalled();
  });

  it("falls back to the app settings when Android refuses the intent", async () => {
    Platform.OS = "android";
    jest.spyOn(Linking, "sendIntent").mockRejectedValue(new Error("no activity"));
    const settings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);

    await pushNotificationsGateway.openNotificationSettings();

    expect(settings).toHaveBeenCalledTimes(1);
  });

  it("opens Vinnot's page in Settings on iOS", async () => {
    Platform.OS = "ios";
    const intent = jest.spyOn(Linking, "sendIntent");
    const settings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);

    await pushNotificationsGateway.openNotificationSettings();

    expect(settings).toHaveBeenCalledTimes(1);
    expect(intent).not.toHaveBeenCalled();
  });
});
