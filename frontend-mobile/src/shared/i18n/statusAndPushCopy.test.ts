import { describe, expect, it } from "@jest/globals";
import i18next, { type TFunction } from "i18next";
import esAR from "./locales/es-AR.json";
import enUS from "./locales/en-US.json";
import { TRANSPORT_ERROR_MESSAGES } from "@/infrastructure/api/errors";
import { SOCIAL_IDENTITY_ERRORS } from "@/infrastructure/identity/socialIdentity.gateway";
import { AUTH_ERROR_MESSAGES } from "@/domain/user/auth.messages";

async function translator(lng: "es-AR" | "en-US"): Promise<TFunction> {
  const instance = i18next.createInstance();
  await instance.init({
    lng,
    fallbackLng: false,
    resources: { "es-AR": { translation: esAR }, "en-US": { translation: enUS } },
    interpolation: { escapeValue: false },
  });
  return instance.t;
}

/** Every value of the backend `EventStatus` enum. */
const EVENT_STATUSES = ["DRAFT", "PUBLISHED", "CANCELLED", "POSTPONED", "SOLD_OUT", "COMPLETED"];

/** Every notification type a backend push template renders. */
const PUSH_TYPES = [
  "ANNOUNCEMENT_TEST",
  "CELLAR_CHECKIN",
  "EVENT_CANCELLED_ATTENDEE",
  "EVENT_CANCELLED_ORGANIZER_SUMMARY",
  "EVENT_CHANGED_ATTENDEE",
  "EVENT_NEARBY",
  "EVENT_REGISTRATION_ATTENDEE",
  "EVENT_REGISTRATION_ORGANIZER",
  "EVENT_REMINDER",
  "MILESTONE",
  "NEW_FOLLOWER",
  "NEWSLETTER",
  "ONBOARDING",
  "PAYMENT_ACCOUNT_RECONNECT_REQUIRED",
  "PAYMENT_CHARGEBACK",
  "POST_EVENT",
  "REVIEW_COMMENT",
  "REVIEW_LIKES_DAILY",
  "ROUTE_PICK",
  "SERVICE_NOTICE",
  "SOCIAL_ACCOUNT_RECONNECT",
  "SOCIAL_BATCH_READY",
  "SOCIAL_POST_FAILED",
  "SOCIAL_TIKTOK_DRAFT_WAITING",
  "TASTE_PICK",
  "TIER_REACHED",
  "VIEWED_NOT_RATED",
  "WEEKEND_EVENTS",
  "WINBACK",
  "WINE_RECOMMENDATION",
  "WINERY_PICK",
];

describe("event status copy", () => {
  it.each(["es-AR", "en-US"] as const)("labels every event status in %s for both maps", async (lng) => {
    const t = await translator(lng);
    for (const status of EVENT_STATUSES) {
      const eventKey = `events.statusLabels.${status.toLowerCase()}`;
      const partnerKey = `partner.statuses.${status}`;
      expect(t(eventKey)).not.toBe(eventKey);
      expect(t(partnerKey)).not.toBe(partnerKey);
    }
  });

  it("labels sold-out and postponed events", async () => {
    const es = await translator("es-AR");
    const en = await translator("en-US");
    expect(es("events.statusLabels.sold_out")).toBe("Agotado");
    expect(es("events.statusLabels.postponed")).toBe("Postergado");
    expect(en("events.statusLabels.sold_out")).toBe("Sold out");
    expect(en("events.statusLabels.postponed")).toBe("Postponed");
    expect(es("partner.statuses.SOLD_OUT")).toBe("Agotado");
    expect(en("partner.statuses.POSTPONED")).toBe("Postponed");
  });

  it("keeps the existing status labels", async () => {
    const es = await translator("es-AR");
    const en = await translator("en-US");
    expect(es("events.statusLabels.published")).toBe("Publicado");
    expect(en("events.statusLabels.cancelled")).toBe("Cancelled");
    expect(es("partner.statuses.DRAFT")).toBe("Borrador");
    expect(en("partner.statuses.COMPLETED")).toBe("Completed");
  });
});

describe("admin push type copy", () => {
  it.each(["es-AR", "en-US"] as const)("labels every backend push type in %s", async (lng) => {
    const t = await translator(lng);
    for (const type of PUSH_TYPES) {
      const key = `admin.notifications.pushTypes.${type}`;
      expect(t(key)).not.toBe(key);
    }
  });

  it("labels the follower, tier and social publishing pushes", async () => {
    const es = await translator("es-AR");
    const en = await translator("en-US");
    expect(es("admin.notifications.pushTypes.NEW_FOLLOWER")).toBe("Nuevo seguidor");
    expect(en("admin.notifications.pushTypes.TIER_REACHED")).toBe("New tier reached");
    expect(es("admin.notifications.pushTypes.SOCIAL_TIKTOK_DRAFT_WAITING")).toBe("Borrador de TikTok pendiente");
    expect(en("admin.notifications.pushTypes.SOCIAL_ACCOUNT_RECONNECT")).toBe("Reconnect social account");
  });

  it("keeps the existing push type labels", async () => {
    const es = await translator("es-AR");
    const en = await translator("en-US");
    expect(es("admin.notifications.pushTypes.EVENT_REMINDER")).toBe("Recordatorio de evento");
    expect(en("admin.notifications.pushTypes.WINERY_PICK")).toBe("Winery of the week");
  });
});

describe("transport error copy", () => {
  it("translates the offline, timeout and unexpected error keys", async () => {
    const es = await translator("es-AR");
    const en = await translator("en-US");
    expect(es("authErrors.offline")).toBe("Sin conexión. Verificá tu internet.");
    expect(en("authErrors.offline")).toBe("No connection. Check your internet.");
    expect(es("authErrors.timeout")).toBe("La solicitud tardó demasiado. Intentá de nuevo.");
    expect(en("authErrors.timeout")).toBe("The request took too long. Please try again.");
    expect(en("authErrors.unexpected")).toBe("An unexpected error occurred. Please try again.");
  });

  it.each(["es-AR", "en-US"] as const)("translates every error key infrastructure and auth return in %s", async (lng) => {
    const t = await translator(lng);
    const keys = [
      ...Object.values(TRANSPORT_ERROR_MESSAGES),
      ...Object.values(SOCIAL_IDENTITY_ERRORS),
      ...Object.values(AUTH_ERROR_MESSAGES),
    ];
    for (const key of keys) expect(t(key)).not.toBe(key);
  });
});
