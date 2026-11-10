/** What the server needs to count a tapped push as opened. */
export interface PushOpen {
  ref: string;
  type: string;
}

const TYPE = /^[A-Z][A-Z0-9_]{0,63}$/;
const MAX_REF_LENGTH = 255;

/** Reads `{ref, type}` from a push's data; older pushes carry only `url`, so they are not tracked. */
export function toPushOpen(data: unknown): PushOpen | null {
  if (typeof data !== "object" || data === null) return null;
  const { ref, type } = data as { ref?: unknown; type?: unknown };
  if (typeof ref !== "string" || ref.length === 0 || ref.length > MAX_REF_LENGTH) return null;
  if (typeof type !== "string" || !TYPE.test(type)) return null;
  return { ref, type };
}
