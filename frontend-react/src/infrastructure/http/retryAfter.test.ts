import { it, expect } from "vitest";
import { retryAfterDeadline } from "./retryAfter";
it("parses seconds and HTTP dates and discards invalid or expired values", () => {
  const now = Date.parse("2026-09-27T12:00:00Z");
  expect(retryAfterDeadline("30", now)).toBe(now + 30000);
  expect(retryAfterDeadline(1, now)).toBe(now + 1000);
  expect(retryAfterDeadline("Sun, 27 Sep 2026 12:01:00 GMT", now)).toBe(
    now + 60000,
  );
  for (const input of [
    null,
    undefined,
    {},
    "",
    " ",
    "nonsense",
    "0",
    "2020-01-01",
  ])
    expect(retryAfterDeadline(input, now)).toBeUndefined();
});
