import { describe, expect, it } from "@jest/globals";
import { launchPushPrompt } from "./pushPermissionPrompt";

describe("launchPushPrompt", () => {
  it("explains notifications on the first launch, before the system was asked, signed in or not", () => {
    expect(launchPushPrompt({ status: "undetermined", introShown: false, signedIn: false })).toBe("intro");
    expect(launchPushPrompt({ status: "undetermined", introShown: false, signedIn: true })).toBe("intro");
  });

  it("reminds a signed-in member whose notifications are off: allow when the system can still ask, settings otherwise", () => {
    expect(launchPushPrompt({ status: "undetermined", introShown: true, signedIn: true })).toBe("enable");
    expect(launchPushPrompt({ status: "denied", introShown: true, signedIn: true })).toBe("settings");
    expect(launchPushPrompt({ status: "denied", introShown: false, signedIn: true })).toBe("settings");
  });

  it("never reminds a signed-out visitor after the first launch", () => {
    expect(launchPushPrompt({ status: "undetermined", introShown: true, signedIn: false })).toBeNull();
    expect(launchPushPrompt({ status: "denied", introShown: false, signedIn: false })).toBeNull();
  });

  it("stays quiet when notifications are on or the device cannot show them", () => {
    expect(launchPushPrompt({ status: "granted", introShown: false, signedIn: true })).toBeNull();
    expect(launchPushPrompt({ status: "unsupported", introShown: false, signedIn: true })).toBeNull();
  });
});
