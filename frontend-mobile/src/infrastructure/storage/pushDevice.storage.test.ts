import AsyncStorage from "@react-native-async-storage/async-storage";
import { pushDeviceStorage } from "./pushDevice.storage";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

it("remembers the last token registered from this device until it is removed", async () => {
  storage.getItem.mockResolvedValueOnce(null).mockResolvedValueOnce("ExponentPushToken[abc]");

  await expect(pushDeviceStorage.registeredToken()).resolves.toBeNull();
  await pushDeviceStorage.rememberToken("ExponentPushToken[abc]");
  await expect(pushDeviceStorage.registeredToken()).resolves.toBe("ExponentPushToken[abc]");
  await pushDeviceStorage.forgetToken();

  expect(storage.setItem).toHaveBeenCalledWith("vinnot_push_device_token", "ExponentPushToken[abc]");
  expect(storage.removeItem).toHaveBeenCalledWith("vinnot_push_device_token");
});
