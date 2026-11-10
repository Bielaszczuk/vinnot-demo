import AsyncStorage from "@react-native-async-storage/async-storage";
import { pushPromptStorage } from "./pushPrompt.storage";

jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn(), setItem: jest.fn() }));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

it("remembers that push notifications were offered on this device", async () => {
  storage.getItem.mockResolvedValueOnce(null).mockResolvedValueOnce("1");

  await expect(pushPromptStorage.wasOffered()).resolves.toBe(false);
  await pushPromptStorage.markOffered();
  await expect(pushPromptStorage.wasOffered()).resolves.toBe(true);
  expect(storage.setItem).toHaveBeenCalledWith("vinnot_push_prompt_offered", "1");
});
