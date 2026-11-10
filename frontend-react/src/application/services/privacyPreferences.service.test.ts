import { describe, it, expect, vi } from "vitest";
import { privacyPreferencesService } from "./privacyPreferences.service";
it("persists, notifies, revokes and synchronizes preferences across tabs", () => {
  const listener = vi.fn();
  const unsubscribe = privacyPreferencesService.subscribe(listener);
  expect(privacyPreferencesService.setExternalMaps(true)).toBe(true);
  expect(privacyPreferencesService.getExternalMaps()).toBe(true);
  expect(localStorage.getItem("vinnot.external-maps.v1")).toBe("allow");
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: "vinnot.external-maps.v1",
      newValue: "deny",
    }),
  );
  expect(privacyPreferencesService.getExternalMaps()).toBe(false);
  window.dispatchEvent(
    new StorageEvent("storage", { key: "other", newValue: "allow" }),
  );
  expect(privacyPreferencesService.getExternalMaps()).toBe(false);
  expect(privacyPreferencesService.setExternalMaps(false)).toBe(true);
  window.dispatchEvent(new StorageEvent("storage", { key: null }));
  expect(listener).toHaveBeenCalledTimes(4);
  unsubscribe();
  privacyPreferencesService.setExternalMaps(false);
  expect(listener).toHaveBeenCalledTimes(4);
});
describe("blocked storage", () => {
  it("reports persistence failure without claiming the preference was saved", () => {
    const blocked = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    expect(privacyPreferencesService.setExternalMaps(false)).toBe(false);
    expect(privacyPreferencesService.getExternalMaps()).toBe(false);
    blocked.mockRestore();
  });
});
