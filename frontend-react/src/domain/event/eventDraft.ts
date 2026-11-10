/** Incomplete editor data stays local; this is not a published/server event. */
export type EventDraftValues = Record<string, string | number | boolean | null>;
export interface EventDraft {
  version: 1;
  savedAt: number;
  values: EventDraftValues;
}
export const EVENT_DRAFT_TTL = 7 * 24 * 60 * 60 * 1000;
export const EVENT_DRAFT_MAX_CHARACTERS = 100_000;

export function readEventDraft(raw: string | null, now: number, fields: string[]): EventDraft | null {
  if (!raw || raw.length > EVENT_DRAFT_MAX_CHARACTERS) return null;
  try {
    const candidate = JSON.parse(raw);
    if (candidate?.version !== 1 || !Number.isFinite(candidate.savedAt)
      || candidate.savedAt > now || now - candidate.savedAt > EVENT_DRAFT_TTL
      || !candidate.values || Array.isArray(candidate.values) || typeof candidate.values !== "object") return null;
    const values: EventDraftValues = {};
    for (const field of fields) {
      if (["__proto__", "constructor", "prototype"].includes(field)) continue;
      const value: unknown = candidate.values[field];
      if (value === null || typeof value === "string" || typeof value === "boolean"
        || (typeof value === "number" && Number.isFinite(value))) values[field] = value;
    }
    return Object.keys(values).length ? { version: 1, savedAt: candidate.savedAt, values } : null;
  } catch { return null; }
}
