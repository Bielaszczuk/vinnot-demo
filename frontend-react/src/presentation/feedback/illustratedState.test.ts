import { it, expect } from "vitest";
import { isNotFoundError, resolveIllustratedState, stateCopy } from "./illustratedState";
it("distinguishes HTTP, transport, and empty states without leaking server details", () => {
  const cases: [unknown, string][] = [
    [null, "server"],
    ["secret", "server"],
    [{}, "server"],
    [{ status: 401 }, "session"],
    [{ status: 403 }, "forbidden"],
    [{ status: 404 }, "notFound"],
    [{ status: 429 }, "rateLimit"],
    [{ status: 500 }, "server"],
    [{ status: 502 }, "unavailable"],
    [{ status: 503 }, "unavailable"],
    [{ status: 504 }, "timeout"],
    [{ code: "TIMEOUT" }, "timeout"],
    [{ code: "NETWORK_ERROR" }, "offline"],
  ];
  for (const [error, kind] of cases)
    expect(resolveIllustratedState(error)).toBe(kind);
  expect(Object.keys(stateCopy.es)).toEqual(Object.keys(stateCopy.en));
});

it("tells a missing resource apart from failures a retry can fix", () => {
  expect(isNotFoundError({ status: 404 })).toBe(true);
  expect(isNotFoundError({ status: 500 })).toBe(false);
  expect(isNotFoundError({ code: "NETWORK_ERROR" })).toBe(false);
});
