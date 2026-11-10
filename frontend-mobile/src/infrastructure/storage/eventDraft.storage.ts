import AsyncStorage from "@react-native-async-storage/async-storage";
import type { EventDraftStorage } from "@/application/ports/EventDraftStorage";

export const eventDraftStorage: EventDraftStorage = {
  read: key => AsyncStorage.getItem(key),
  write: (key, value) => AsyncStorage.setItem(key, value),
  remove: key => AsyncStorage.removeItem(key),
};
