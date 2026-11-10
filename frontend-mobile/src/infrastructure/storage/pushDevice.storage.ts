import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/shared/config/constants";

/**
 * The last push token this device registered, kept across launches so the registration can be removed when the
 * member turns notifications off in the system settings (the token cannot be read reliably without permission).
 */
export const pushDeviceStorage = {
  registeredToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.PUSH_DEVICE_TOKEN);
  },

  rememberToken(token: string): Promise<void> {
    return AsyncStorage.setItem(STORAGE_KEYS.PUSH_DEVICE_TOKEN, token);
  },

  forgetToken(): Promise<void> {
    return AsyncStorage.removeItem(STORAGE_KEYS.PUSH_DEVICE_TOKEN);
  },
};
