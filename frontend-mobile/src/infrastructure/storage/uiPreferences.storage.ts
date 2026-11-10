import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/shared/config/constants";

export const uiPreferencesStorage = {
  read(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.UI_THEME);
  },

  write(serializedPreferences: string): Promise<void> {
    return AsyncStorage.setItem(STORAGE_KEYS.UI_THEME, serializedPreferences);
  },
};
