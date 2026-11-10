import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/shared/config/constants";

/** How many times this device has rated with the pour control, so the drag demo can retire. */
export const ratingGestureStorage = {
  async readCount(): Promise<number> {
    const count = Number(await AsyncStorage.getItem(STORAGE_KEYS.RATING_GESTURE_COUNT));
    return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  },

  writeCount(count: number): Promise<void> {
    return AsyncStorage.setItem(STORAGE_KEYS.RATING_GESTURE_COUNT, String(count));
  },
};
