import esAR from "@/shared/i18n/locales/es-AR.json";
import enUS from "@/shared/i18n/locales/en-US.json";
import {
  ILLUSTRATED_STATE_KINDS,
  illustratedStateCopyKeys,
  resolveIllustratedState,
  retryableLoadError,
} from "./illustratedState";
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
  for (const [error, kind] of cases) expect(resolveIllustratedState(error)).toBe(kind);
});
it("keeps every illustrated state's copy in both locale files", () => {
  for (const kind of ILLUSTRATED_STATE_KINDS) {
    expect(illustratedStateCopyKeys(kind)).toEqual({
      title: `illustratedState.${kind}.title`,
      description: `illustratedState.${kind}.description`,
    });
    for (const locale of [esAR, enUS]) {
      const copy = (locale.illustratedState as Record<string, { title: string; description: string }>)[kind];
      expect(copy?.title).toBeTruthy();
      expect(copy?.description).toBeTruthy();
    }
  }
  expect(Object.keys(esAR.illustratedState).sort()).toEqual([...ILLUSTRATED_STATE_KINDS].sort());
  expect(Object.keys(enUS.illustratedState).sort()).toEqual([...ILLUSTRATED_STATE_KINDS].sort());
});
it("calls the cellar Bodega, as the rest of the Spanish UI does", () => {
  expect(esAR.illustratedState.emptyCellar.title).toMatch(/bodega/i);
  expect(esAR.illustratedState.emptyCellar.title).not.toMatch(/cava/i);
});
it("offers a retryable load error for failures other than a real 404", () => {
  const offline = { code: "NETWORK_ERROR" };
  expect(retryableLoadError(true, offline)).toBe(offline);
  expect(retryableLoadError(true, { status: 500 })).toEqual({ status: 500 });
  expect(retryableLoadError(true, undefined)).toEqual({});
  expect(retryableLoadError(true, { status: 404 })).toBeUndefined();
  expect(retryableLoadError(false, offline)).toBeUndefined();
});
