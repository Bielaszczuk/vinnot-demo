import { pushNotificationsService } from "@/application/services/pushNotifications.service";
import { notificationsApiClient } from "@/infrastructure/api/clients/notifications.client";
import { pushNotificationsGateway } from "@/infrastructure/device/pushNotifications.gateway";
import { pushDeviceStorage } from "@/infrastructure/storage/pushDevice.storage";
import type { PushChannel } from "@/domain/notification/pushChannels";

jest.mock("@/infrastructure/api/clients/notifications.client", () => ({
  notificationsApiClient: { registerPushDevice: jest.fn(), unregisterPushDevice: jest.fn(), reportPushOpen: jest.fn() },
}));
jest.mock("@/infrastructure/storage/pushPrompt.storage", () => ({
  pushPromptStorage: { wasOffered: jest.fn(), markOffered: jest.fn() },
}));
jest.mock("@/infrastructure/storage/pushDevice.storage", () => ({
  pushDeviceStorage: { registeredToken: jest.fn(), rememberToken: jest.fn(), forgetToken: jest.fn() },
}));
jest.mock("@/shared/devLog", () => ({ devWarn: jest.fn() }));
jest.mock("@/infrastructure/device/pushNotifications.gateway", () => ({
  pushNotificationsGateway: {
    isSupported: jest.fn(),
    platform: jest.fn(),
    permission: jest.fn(),
    requestPermission: jest.fn(),
    prepare: jest.fn(),
    token: jest.fn(),
    onTokenChange: jest.fn(),
    onOpen: jest.fn(),
    launchData: jest.fn(),
    openNotificationSettings: jest.fn(),
  },
}));

const gateway = pushNotificationsGateway as jest.Mocked<typeof pushNotificationsGateway>;
const client = notificationsApiClient as jest.Mocked<typeof notificationsApiClient>;
const deviceStorage = pushDeviceStorage as jest.Mocked<typeof pushDeviceStorage>;
const { devWarn } = jest.requireMock("@/shared/devLog") as { devWarn: jest.Mock };
const channels: PushChannel[] = [
  { id: "tickets", importance: "high", name: "Entradas y cuenta", description: "Entradas" },
  { id: "default", importance: "default", name: "Vinnot", description: "Otros avisos" },
];
const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  jest.clearAllMocks();
  pushNotificationsService.forgetToken();
  gateway.isSupported.mockReturnValue(true);
  gateway.platform.mockReturnValue("IOS");
  gateway.permission.mockResolvedValue("granted");
  gateway.prepare.mockResolvedValue(false);
  gateway.token.mockResolvedValue("ExponentPushToken[abc]");
  client.registerPushDevice.mockResolvedValue(undefined);
  client.unregisterPushDevice.mockResolvedValue(undefined);
  client.reportPushOpen.mockResolvedValue(undefined);
  deviceStorage.registeredToken.mockResolvedValue(null);
  deviceStorage.rememberToken.mockResolvedValue(undefined);
  deviceStorage.forgetToken.mockResolvedValue(undefined);
});

/** A cold start: the per-launch state lives in the module, so each launch loads it again. */
function freshLaunch() {
  let service!: typeof pushNotificationsService;
  let launchGateway!: jest.Mocked<typeof pushNotificationsGateway>;
  let promptStorage!: { wasOffered: jest.Mock; markOffered: jest.Mock };
  jest.isolateModules(() => {
    service = jest.requireActual("@/application/services/pushNotifications.service").pushNotificationsService;
    launchGateway = jest.requireMock("@/infrastructure/device/pushNotifications.gateway").pushNotificationsGateway;
    promptStorage = jest.requireMock("@/infrastructure/storage/pushPrompt.storage").pushPromptStorage;
  });
  launchGateway.isSupported.mockReturnValue(true);
  launchGateway.permission.mockResolvedValue("undetermined");
  launchGateway.prepare.mockResolvedValue(true);
  launchGateway.requestPermission.mockResolvedValue(false);
  promptStorage.wasOffered.mockResolvedValue(false);
  promptStorage.markOffered.mockResolvedValue(undefined);
  return { service, gateway: launchGateway, promptStorage };
}

describe("pushNotificationsService", () => {
  it("tells whether this device can show pushes", async () => {
    await expect(pushNotificationsService.deviceStatus()).resolves.toBe("granted");
    gateway.permission.mockResolvedValue("denied");
    await expect(pushNotificationsService.deviceStatus()).resolves.toBe("denied");
    gateway.isSupported.mockReturnValue(false);
    await expect(pushNotificationsService.deviceStatus()).resolves.toBe("unsupported");
  });

  describe("the sheet a cold start shows", () => {
    it("explains notifications on the first launch, remembers it, and shows nothing else in that launch", async () => {
      const launch = freshLaunch();

      await expect(launch.service.launchPrompt(false)).resolves.toBe("intro");
      expect(launch.promptStorage.markOffered).toHaveBeenCalledTimes(1);
      expect(launch.gateway.requestPermission).not.toHaveBeenCalled();

      await expect(launch.service.launchPrompt(true)).resolves.toBeNull();
      await expect(launch.service.offerAfterEvent()).resolves.toBe(false);
    });

    it("reminds a signed-in member on every cold start while notifications are off, once per launch", async () => {
      for (const [status, prompt] of [["undetermined", "enable"], ["denied", "settings"], ["denied", "settings"]] as const) {
        const launch = freshLaunch();
        launch.promptStorage.wasOffered.mockResolvedValue(true);
        launch.gateway.permission.mockResolvedValue(status);

        await expect(launch.service.launchPrompt(true)).resolves.toBe(prompt);
        await expect(launch.service.launchPrompt(true)).resolves.toBeNull();
        expect(launch.promptStorage.markOffered).not.toHaveBeenCalled();
      }
    });

    it("waits for the sign-in before reminding a visitor", async () => {
      const launch = freshLaunch();
      launch.promptStorage.wasOffered.mockResolvedValue(true);

      await expect(launch.service.launchPrompt(false)).resolves.toBeNull();
      await expect(launch.service.launchPrompt(true)).resolves.toBe("enable");
    });

    it("stays quiet when notifications are on or the device cannot show them", async () => {
      const launch = freshLaunch();
      launch.gateway.permission.mockResolvedValue("granted");
      await expect(launch.service.launchPrompt(true)).resolves.toBeNull();

      launch.gateway.isSupported.mockReturnValue(false);
      await expect(launch.service.launchPrompt(true)).resolves.toBeNull();
      expect(launch.promptStorage.markOffered).not.toHaveBeenCalled();
    });

    it("a confirmed ticket explains notifications only while the system can still ask and nothing showed in this launch", async () => {
      const launch = freshLaunch();
      launch.gateway.permission.mockResolvedValue("denied");
      await expect(launch.service.offerAfterEvent()).resolves.toBe(false);

      launch.gateway.permission.mockResolvedValue("undetermined");
      await expect(launch.service.offerAfterEvent()).resolves.toBe(true);
      await expect(launch.service.offerAfterEvent()).resolves.toBe(false);
      await expect(launch.service.launchPrompt(true)).resolves.toBeNull();
    });
  });

  describe("allowing from a sheet", () => {
    it("creates the channels before the system prompt (Android 13+), then registers the signed-in device", async () => {
      const order: string[] = [];
      gateway.platform.mockReturnValue("ANDROID");
      gateway.prepare.mockImplementation(async () => {
        order.push("channels");
        return true;
      });
      gateway.requestPermission.mockImplementation(async () => {
        order.push("prompt");
        return true;
      });

      await expect(pushNotificationsService.allowFromPrompt("es-AR", channels, true)).resolves.toBe(true);

      expect(order.slice(0, 2)).toEqual(["channels", "prompt"]);
      expect(gateway.prepare).toHaveBeenCalledWith(channels);
      expect(client.registerPushDevice).toHaveBeenCalledWith({
        token: "ExponentPushToken[abc]", platform: "ANDROID", locale: "es", channels: true,
      });
    });

    it("a refused system prompt removes this device from the account", async () => {
      gateway.requestPermission.mockResolvedValue(false);
      gateway.permission.mockResolvedValue("denied");
      deviceStorage.registeredToken.mockResolvedValue("ExponentPushToken[old]");

      await expect(pushNotificationsService.allowFromPrompt("es-AR", channels, true)).resolves.toBe(false);

      expect(client.registerPushDevice).not.toHaveBeenCalled();
      expect(client.unregisterPushDevice).toHaveBeenCalledWith({ token: "ExponentPushToken[old]" });
      expect(deviceStorage.forgetToken).toHaveBeenCalledTimes(1);
    });

    it("signed out, only the system is asked; the sign-in registers later", async () => {
      gateway.requestPermission.mockResolvedValue(true);

      await expect(pushNotificationsService.allowFromPrompt("es-AR", channels, false)).resolves.toBe(true);

      expect(client.registerPushDevice).not.toHaveBeenCalled();
      expect(client.unregisterPushDevice).not.toHaveBeenCalled();
    });

    it("never prompts or creates channels on a simulator", async () => {
      gateway.isSupported.mockReturnValue(false);

      await expect(pushNotificationsService.requestPermission(channels)).resolves.toBe(false);
      await pushNotificationsService.prepare(channels);
      expect(gateway.requestPermission).not.toHaveBeenCalled();
      expect(gateway.prepare).not.toHaveBeenCalled();
    });
  });

  it("asks the system once when push is turned on in the preferences, then registers the device", async () => {
    gateway.permission.mockResolvedValueOnce("undetermined").mockResolvedValue("granted");
    gateway.requestPermission.mockResolvedValue(true);

    await expect(pushNotificationsService.enableOnThisDevice("es-AR", channels)).resolves.toBe("granted");

    expect(gateway.requestPermission).toHaveBeenCalledTimes(1);
    expect(client.registerPushDevice).toHaveBeenCalledWith({ token: "ExponentPushToken[abc]", platform: "IOS", locale: "es" });
  });

  it("registers nothing when the system prompt is refused in the preferences", async () => {
    gateway.permission.mockResolvedValueOnce("undetermined").mockResolvedValue("denied");
    gateway.requestPermission.mockResolvedValue(false);

    await expect(pushNotificationsService.enableOnThisDevice("es-AR", channels)).resolves.toBe("denied");

    expect(client.registerPushDevice).not.toHaveBeenCalled();
  });

  it("never shows the system prompt when the system already decided or cannot show pushes", async () => {
    await expect(pushNotificationsService.enableOnThisDevice("es-AR", channels)).resolves.toBe("granted");
    expect(client.registerPushDevice).toHaveBeenCalledTimes(1);

    gateway.permission.mockResolvedValue("denied");
    await expect(pushNotificationsService.enableOnThisDevice("es-AR", channels)).resolves.toBe("denied");

    gateway.isSupported.mockReturnValue(false);
    await expect(pushNotificationsService.enableOnThisDevice("es-AR", channels)).resolves.toBe("unsupported");
    expect(gateway.requestPermission).not.toHaveBeenCalled();
    expect(client.registerPushDevice).toHaveBeenCalledTimes(1);
  });

  it("registers this device in the account language, remembers the token and hands it to logout", async () => {
    await expect(pushNotificationsService.register("en-US", channels)).resolves.toBe("ExponentPushToken[abc]");

    expect(gateway.prepare).toHaveBeenCalledWith(channels);
    expect(client.registerPushDevice).toHaveBeenCalledWith({ token: "ExponentPushToken[abc]", platform: "IOS", locale: "en" });
    expect(deviceStorage.rememberToken).toHaveBeenCalledWith("ExponentPushToken[abc]");
    gateway.token.mockClear();
    await expect(pushNotificationsService.tokenForLogout()).resolves.toBe("ExponentPushToken[abc]");
    expect(gateway.token).not.toHaveBeenCalled();
  });

  it("tells the server once the Android channels exist", async () => {
    gateway.platform.mockReturnValue("ANDROID");
    gateway.prepare.mockResolvedValue(true);

    await pushNotificationsService.register("es-AR", channels);

    expect(client.registerPushDevice).toHaveBeenCalledWith({
      token: "ExponentPushToken[abc]", platform: "ANDROID", locale: "es", channels: true,
    });
  });

  it("registers nothing without permission, never asks for it on its own, and removes a registration left behind", async () => {
    gateway.permission.mockResolvedValue("undetermined");

    await expect(pushNotificationsService.register("es-AR", channels)).resolves.toBeNull();
    expect(client.unregisterPushDevice).not.toHaveBeenCalled();

    deviceStorage.registeredToken.mockResolvedValue("ExponentPushToken[old]");
    gateway.permission.mockResolvedValue("denied");
    await expect(pushNotificationsService.register("es-AR", channels)).resolves.toBeNull();

    expect(gateway.requestPermission).not.toHaveBeenCalled();
    expect(client.registerPushDevice).not.toHaveBeenCalled();
    expect(client.unregisterPushDevice).toHaveBeenCalledWith({ token: "ExponentPushToken[old]" });
    expect(deviceStorage.forgetToken).toHaveBeenCalledTimes(1);
    await expect(pushNotificationsService.tokenForLogout()).resolves.toBeNull();
  });

  it("keeps the token to remove when the removal fails, so the next launch tries again", async () => {
    deviceStorage.registeredToken.mockResolvedValue("ExponentPushToken[old]");
    gateway.permission.mockResolvedValue("denied");
    client.unregisterPushDevice.mockRejectedValue(new Error("offline"));

    await expect(pushNotificationsService.register("es-AR", channels)).rejects.toThrow("offline");

    expect(deviceStorage.forgetToken).not.toHaveBeenCalled();
  });

  it("a failed registration keeps no token, but logout still reads the device token while permission is granted", async () => {
    client.registerPushDevice.mockRejectedValue(new Error("offline"));

    await expect(pushNotificationsService.register("es-AR", channels)).rejects.toThrow("offline");
    gateway.token.mockResolvedValue("ExponentPushToken[device]");
    await expect(pushNotificationsService.tokenForLogout()).resolves.toBe("ExponentPushToken[device]");
    gateway.token.mockRejectedValue(new Error("no token"));
    await expect(pushNotificationsService.tokenForLogout()).resolves.toBeNull();
  });

  it("logout waits for a registration still in flight", async () => {
    let finish: () => void = () => undefined;
    client.registerPushDevice.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    const registration = pushNotificationsService.register("es-AR", channels);
    const logoutToken = pushNotificationsService.tokenForLogout();
    await flush();
    finish();

    await expect(registration).resolves.toBe("ExponentPushToken[abc]");
    await expect(logoutToken).resolves.toBe("ExponentPushToken[abc]");
  });

  it("logout still finds the device token when the registration in flight fails", async () => {
    let fail: (error: Error) => void = () => undefined;
    client.registerPushDevice.mockReturnValue(new Promise<void>((_resolve, reject) => { fail = reject; }));
    const registration = pushNotificationsService.register("es-AR", channels);
    const logoutToken = pushNotificationsService.tokenForLogout();
    await flush();
    fail(new Error("offline"));

    await expect(registration).rejects.toThrow("offline");
    await expect(logoutToken).resolves.toBe("ExponentPushToken[abc]");
  });

  it("simulators report denied", async () => {
    gateway.isSupported.mockReturnValue(false);

    await expect(pushNotificationsService.permission()).resolves.toBe("denied");
  });

  it("hands over the validated route and the open reference of a tapped push", () => {
    const taps: unknown[] = [];
    let tap: (data: unknown) => void = () => undefined;
    gateway.onOpen.mockImplementation((listener) => {
      tap = listener;
      return () => undefined;
    });
    pushNotificationsService.onOpen((opened) => taps.push(opened));
    tap({ url: "/my-tickets/r1", type: "EVENT_REGISTRATION_ATTENDEE", ref: "ticket:r1" });
    tap({ url: "https://evil.example", type: "TASTE_PICK", ref: "taste:1" });
    tap({ url: "/wines/w1" });
    tap(null);

    expect(taps).toEqual([
      { route: "/my-tickets/r1", open: { ref: "ticket:r1", type: "EVENT_REGISTRATION_ATTENDEE" } },
      { route: null, open: { ref: "taste:1", type: "TASTE_PICK" } },
      { route: "/wines/w1", open: null },
      { route: null, open: null },
    ]);
  });

  it("reads the push that launched the app, if any", async () => {
    gateway.launchData
      .mockResolvedValueOnce({ url: "/events/e1", type: "EVENT_REMINDER", ref: "reminder:e1" })
      .mockResolvedValueOnce(null);

    await expect(pushNotificationsService.launchTap()).resolves.toEqual({
      route: "/events/e1",
      open: { ref: "reminder:e1", type: "EVENT_REMINDER" },
    });
    await expect(pushNotificationsService.launchTap()).resolves.toBeNull();
  });

  it("reports an open without waiting, and a failure never surfaces", async () => {
    client.reportPushOpen.mockRejectedValueOnce(new Error("offline"));

    expect(pushNotificationsService.reportOpen({ ref: "taste:1", type: "TASTE_PICK" })).toBeUndefined();
    await flush();

    expect(client.reportPushOpen).toHaveBeenCalledWith({ ref: "taste:1", type: "TASTE_PICK" });
    expect(devWarn).toHaveBeenCalledWith("Push open not reported", expect.any(Error));
  });

  it("reports a rotation only when the device token really changes (iOS repeats it on every request)", () => {
    const unsubscribe = jest.fn();
    let report: (deviceToken: string) => void = () => undefined;
    gateway.onTokenChange.mockImplementation((listener) => {
      report = listener;
      return unsubscribe;
    });
    const listener = jest.fn();

    expect(pushNotificationsService.onTokenChange(listener)).toBe(unsubscribe);
    report("device-a");
    report("device-a");
    expect(listener).not.toHaveBeenCalled();
    report("device-b");
    report("device-b");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

it("opens this app's notification settings through the device", async () => {
  gateway.openNotificationSettings.mockResolvedValue(undefined);

  await pushNotificationsService.openNotificationSettings();

  expect(gateway.openNotificationSettings).toHaveBeenCalledTimes(1);
});
