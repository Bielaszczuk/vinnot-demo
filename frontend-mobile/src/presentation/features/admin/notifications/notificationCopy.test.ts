import { describe, expect, it } from "@jest/globals";
import esAR from "@/shared/i18n/locales/es-AR.json";
import enUS from "@/shared/i18n/locales/en-US.json";
import { ADMIN_NOTIFICATION_ERROR_CODES } from "@/domain/admin/adminNotificationErrors";
import {
  ANNOUNCEMENT_DESTINATIONS,
  ANNOUNCEMENT_KINDS,
  ANNOUNCEMENT_LANGUAGES,
  ANNOUNCEMENT_ROLES,
  type AnnouncementDraftError,
} from "@/domain/admin/announcement";
import { ANNOUNCEMENT_FORMATS } from "@/domain/admin/announcementFormat";
import { PUSH_OUTCOMES } from "@/domain/admin/pushAdministration";
import { ANNOUNCEMENT_STAT_KEYS } from "@/domain/admin/announcementStats";

type Tree = { [key: string]: string | Tree };

function keys(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? [`${prefix}${key}`] : keys(value, `${prefix}${key}.`),
  );
}

function at(tree: Tree, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => (node as Tree | undefined)?.[key], tree);
}

const DRAFT_ERRORS: AnnouncementDraftError[] = [
  "CHANNEL_REQUIRED",
  "CONTENT_REQUIRED",
  "TITLE_REQUIRED",
  "TITLE_TOO_LONG",
  "BODY_REQUIRED",
  "BODY_TOO_LONG",
];

const locales: [string, Tree][] = [
  ["es-AR", esAR.admin.notifications as unknown as Tree],
  ["en-US", enUS.admin.notifications as unknown as Tree],
];

describe("admin notifications copy", () => {
  it("has the same keys in Spanish and English", () => {
    expect(keys(locales[0]![1]).sort()).toEqual(keys(locales[1]![1]).sort());
  });

  it.each(locales)("%s explains every backend refusal with its own message", (_locale, copy) => {
    const messages = ADMIN_NOTIFICATION_ERROR_CODES.map((code) => at(copy, `errors.${code}`));
    messages.forEach((message) => expect(typeof message).toBe("string"));
    expect(new Set(messages).size).toBe(messages.length);
    expect(at(copy, "errors.generic")).toEqual(expect.any(String));
  });

  it.each(locales)("%s names every kind, language, role, destination, format, outcome and draft problem", (_l, copy) => {
    const paths = [
      ...ANNOUNCEMENT_KINDS.flatMap((kind) => [`kinds.${kind}.title`, `kinds.${kind}.description`, `kinds.${kind}.audience`]),
      ...ANNOUNCEMENT_LANGUAGES.map((language) => `languages.${language}`),
      ...ANNOUNCEMENT_ROLES.map((role) => `roles.${role}`),
      ...ANNOUNCEMENT_DESTINATIONS.map((destination) => `destinations.${destination}`),
      ...ANNOUNCEMENT_FORMATS.flatMap((format) => [`composer.formats.${format}`, `composer.formatFallback.${format}`]),
      ...PUSH_OUTCOMES.map((outcome) => `metrics.outcomes.${outcome}`),
      ...DRAFT_ERRORS.map((error) => `draftErrors.${error}`),
    ];
    paths.forEach((path) => expect([path, typeof at(copy, path)]).toEqual([path, "string"]));
  });

  it.each(locales)("%s names every engagement push type", (_locale, copy) => {
    const types = [
      "TASTE_PICK", "ROUTE_PICK", "VIEWED_NOT_RATED", "CELLAR_CHECKIN", "WEEKEND_EVENTS",
      "WINERY_PICK", "ONBOARDING", "WINBACK", "MILESTONE", "POST_EVENT",
    ];
    types.forEach((type) => expect([type, typeof at(copy, `pushTypes.${type}`)]).toEqual([type, "string"]));
  });

  it("names the three tabs, the channels and the plain-text toggle as the owner asked", () => {
    const es = esAR.admin.notifications;
    const en = enUS.admin.notifications;
    expect([es.tabs.compose, es.tabs.history, es.tabs.settings]).toEqual([
      "Enviar anuncio",
      "Historial y métricas",
      "Ajustes de push",
    ]);
    expect([en.tabs.compose, en.tabs.history, en.tabs.settings]).toEqual([
      "Send announcement",
      "History and metrics",
      "Push settings",
    ]);
    expect([es.audience.channels, es.audience.email, es.audience.push]).toEqual(["Canal", "Email", "Notificación push"]);
    expect([en.audience.channels, en.audience.email, en.audience.push]).toEqual(["Channel", "Email", "Push notification"]);
    expect(es.preview.showPlainText).toBe("Ver versión texto plano");
    expect(en.preview.showPlainText).toBe("View plain-text version");
  });

  it.each(locales)("%s labels and explains every delivery count of an announcement", (_locale, copy) => {
    ANNOUNCEMENT_STAT_KEYS.forEach((key) => {
      expect([key, typeof at(copy, `stats.labels.${key}`)]).toEqual([key, "string"]);
      expect([key, typeof at(copy, `stats.hints.${key}`)]).toEqual([key, "string"]);
    });
  });

  it("writes the drawn email in the language of each locale, like the backend email", () => {
    expect(esAR.admin.notifications.email.promotionalFooter).toBe(
      "Recibís este correo porque aceptaste recibir novedades de Vinnot.",
    );
    expect(enUS.admin.notifications.email.promotionalFooter).toBe(
      "You receive this email because you agreed to receive news from Vinnot.",
    );
    expect(esAR.admin.notifications.email.unsubscribe).toBe("Darte de baja");
    expect(enUS.admin.notifications.email.unsubscribe).toBe("Unsubscribe");
  });

  it("labels the dashboard entry in both languages", () => {
    expect(esAR.admin.actions.manageNotifications).toBe("Notificaciones");
    expect(enUS.admin.actions.manageNotifications).toBe("Notifications");
    expect(esAR.admin.actions.manageNotificationsDesc).toEqual(expect.any(String));
    expect(enUS.admin.actions.manageNotificationsDesc).toEqual(expect.any(String));
  });
});
