import { describe, expect, it } from "@jest/globals";
import {
  availableChannels,
  canChange,
  isMarketingConsentChange,
  type NotificationPreference,
} from "./notificationPreferences";

const preference = (overrides: Partial<NotificationPreference>): NotificationPreference => ({
  category: "EVENTS_NEARBY",
  kind: "OPTIONAL",
  email: true,
  push: true,
  editable: true,
  emailAvailable: true,
  pushAvailable: true,
  ...overrides,
});

describe("notification preferences", () => {
  it("never lets a transactional category change", () => {
    expect(canChange(preference({ category: "SECURITY", kind: "TRANSACTIONAL", editable: false }), true)).toBe(false);
  });

  it("lets optional categories change without marketing consent", () => {
    expect(canChange(preference({}), false)).toBe(true);
  });

  it("locks promotional categories until marketing consent is granted", () => {
    const newsletter = preference({ category: "NEWSLETTER", kind: "PROMOTIONAL", email: false, push: false });
    expect(canChange(newsletter, false)).toBe(false);
    expect(canChange(newsletter, true)).toBe(true);
  });

  it("recognises a consent change only when the decision differs", () => {
    expect(isMarketingConsentChange(false, true)).toBe(true);
    expect(isMarketingConsentChange(true, true)).toBe(false);
  });
});

describe("availableChannels", () => {
  it("lists only the channels the category sends through", () => {
    expect(availableChannels(preference({ emailAvailable: false, pushAvailable: true }))).toEqual(["push"]);
    expect(availableChannels(preference({ emailAvailable: true, pushAvailable: false }))).toEqual(["email"]);
    expect(availableChannels(preference({ emailAvailable: true, pushAvailable: true }))).toEqual(["email", "push"]);
  });
});
