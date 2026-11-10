import AsyncStorage from "@react-native-async-storage/async-storage";
import { ratingGestureStorage } from "./ratingGesture.storage";

jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn(), setItem: jest.fn() }));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe("ratingGestureStorage", () => {
  it("counts the ratings made on this device", async () => {
    storage.getItem.mockResolvedValueOnce(null).mockResolvedValueOnce("2");

    await expect(ratingGestureStorage.readCount()).resolves.toBe(0);
    await expect(ratingGestureStorage.readCount()).resolves.toBe(2);
    await ratingGestureStorage.writeCount(3);
    expect(storage.setItem).toHaveBeenCalledWith("vinnot_rating_gesture_count", "3");
  });

  it("reads anything that is not a count as none", async () => {
    storage.getItem.mockResolvedValueOnce("garbage").mockResolvedValueOnce("-4");

    await expect(ratingGestureStorage.readCount()).resolves.toBe(0);
    await expect(ratingGestureStorage.readCount()).resolves.toBe(0);
  });
});
