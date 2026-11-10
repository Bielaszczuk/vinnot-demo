import type { EventDraftStorage } from "@/application/ports/EventDraftStorage";
import { EVENT_DRAFT_MAX_CHARACTERS, readEventDraft, type EventDraftValues } from "@/domain/event/eventDraft";

/** Serializes writes/removal per account and editor, so a late save cannot revive a discarded draft. */
export function createEventDraftService(storage: EventDraftStorage, now = Date.now) {
  const pending = new Map<string, Promise<unknown>>();
  const key = (owner: string, eventId?: string) => `vinnot:event-draft:v1:${encodeURIComponent(owner)}:${encodeURIComponent(eventId ?? "new")}`;
  function enqueue<T>(id: string, task: () => Promise<T>): Promise<T> {
    const next = (pending.get(id) ?? Promise.resolve()).catch(() => undefined).then(task);
    pending.set(id, next);
    void next.finally(() => { if (pending.get(id) === next) pending.delete(id); }).catch(() => undefined);
    return next;
  }
  return {
    load(owner: string, eventId: string | undefined, fields: string[]) {
      return enqueue(key(owner, eventId), async () => readEventDraft(await storage.read(key(owner, eventId)), now(), fields));
    },
    save(owner: string, eventId: string | undefined, values: EventDraftValues) {
      const raw = JSON.stringify({ version: 1, savedAt: now(), values });
      if (raw.length > EVENT_DRAFT_MAX_CHARACTERS) return Promise.reject(new Error("Draft exceeds local storage limit"));
      return enqueue(key(owner, eventId), () => storage.write(key(owner, eventId), raw));
    },
    remove(owner: string, eventId?: string) {
      return enqueue(key(owner, eventId), () => storage.remove(key(owner, eventId)));
    },
  };
}
