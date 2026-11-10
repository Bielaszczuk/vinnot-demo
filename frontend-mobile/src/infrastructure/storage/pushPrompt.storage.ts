import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/shared/config/constants";

/** Remembers that the first-launch explanation of push notifications was shown on this device. */
export const pushPromptStorage = {
  async wasOffered(): Promise<boolean> {
    return (await AsyncStorage.getItem(STORAGE_KEYS.PUSH_PROMPT_OFFERED)) === "1";
  },

  markOffered(): Promise<void> {
    return AsyncStorage.setItem(STORAGE_KEYS.PUSH_PROMPT_OFFERED, "1");
  },
};
