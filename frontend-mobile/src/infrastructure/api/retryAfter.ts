/** Convert a transport Retry-After value to an absolute deadline once, at receipt. */
export function retryAfterDeadline(value: unknown, now = Date.now()): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  const seconds = /^\d+(\.\d+)?$/.test(text) ? Number(text) : undefined;
  const deadline = seconds === undefined ? Date.parse(text) : now + seconds * 1000;
  return Number.isFinite(deadline) && deadline > now ? deadline : undefined;
}
