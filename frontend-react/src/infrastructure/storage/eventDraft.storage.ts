import type { EventDraftStorage } from "@/application/ports/EventDraftStorage";

export const eventDraftStorage: EventDraftStorage = {
  read: async key => localStorage.getItem(key),
  write: async (key, value) => { localStorage.setItem(key, value); },
  remove: async key => { localStorage.removeItem(key); },
};
