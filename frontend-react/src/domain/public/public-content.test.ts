import { describe, it, expect } from "vitest";
import {
  findPublicPage,
  publicContact,
  publicContentVersion,
  publicLocale,
  publicPages,
  publicPagePath,
  searchPublicSections,
} from "./public-content";
import { isSupportMessageValid } from "./support";
describe("public content contract", () => {
  it("provides the same complete structure in Spanish and English", () => {
    expect(publicContact.email).toBe("vinnotapp@gmail.com");
    expect(publicContentVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(publicLocale("en-US")).toBe("en");
    expect(publicLocale("ES-ar")).toBe("es");
    expect(findPublicPage("absent")).toBeUndefined();
    expect(new Set(publicPages.map((page) => page.slug)).size).toBe(
      publicPages.length,
    );
    for (const page of publicPages) {
      expect(findPublicPage(page.slug)).toBe(page);
      expect(page.sections.length).toBeGreaterThan(0);
      for (const language of ["es", "en"] as const) {
        expect(page.title[language].length).toBeGreaterThan(3);
        expect(page.summary[language].length).toBeGreaterThan(20);
        for (const section of page.sections) {
          expect(section.title[language]).toBeTruthy();
          expect(section.body[language].length).toBeGreaterThan(40);
        }
      }
    }
  });
  it("explains the app activity it records and the notification defaults", () => {
    const privacy = findPublicPage("privacy")!;
    const section = (id: string) => privacy.sections.find((item) => item.id === id)!;
    expect(section("activity").title).toEqual({ es: "Actividad en la app", en: "Activity in the app" });
    expect(section("activity").body).toEqual({
      es: "Para personalizar tus sugerencias y elegir cuándo enviarte avisos, registramos qué vinos, rutas, eventos y bodegas abrís en la app, cuándo abrís la app (como mucho una vez cada 30 minutos, para conocer tu horario habitual en tu zona horaria) y qué notificaciones abrís. Estos datos no se muestran a otras personas ni se comparten con terceros. Se eliminan automáticamente a los 180 días y, antes, junto con tu cuenta.",
      en: "To personalise your suggestions and choose when to send you notifications, we record which wines, routes, events and wineries you open in the app, when you open the app (at most once every 30 minutes, to learn your usual time in your time zone) and which notifications you open. This data is never shown to other people or shared with third parties. It is deleted automatically after 180 days, and earlier together with your account.",
    });
    for (const id of ["communications", "taste-recommendations"]) {
      expect(section(id).body.es).not.toMatch(/solo se envían si aceptaste|diste tu consentimiento de marketing/);
      expect(section(id).body.en).not.toMatch(/only sent if you agreed|gave marketing consent/);
    }
    expect(section("communications").body.es).toContain("vienen activadas");
    expect(section("communications").body.es).toContain("como mucho dos por semana");
    expect(section("communications").body.es).toContain("entre las 22:00 y las 09:00");
    expect(section("communications").body.en).toContain("start switched on");
    expect(section("communications").body.en).toContain("at most two a week");
    expect(section("communications").body.en).toContain("between 22:00 and 09:00");
  });
  it("links stable aliases and searches accents without altering documents", () => {
    expect(publicPagePath("privacy")).toBe("/privacy");
    expect(publicPagePath("moderation")).toBe("/legal/moderation");
    const help = findPublicPage("help")!;
    expect(searchPublicSections(help, "", "es")).toHaveLength(
      help.sections.length,
    );
    expect(searchPublicSections(help, "zzzzzz", "en")).toEqual([]);
    const section = help.sections[0]!;
    expect(
      searchPublicSections(
        help,
        section.title.es
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toUpperCase(),
        "es",
      ),
    ).toContain(section);
  });
  it("bounds support fields and rejects invalid contacts", () => {
    const valid = {
      name: "Name",
      email: "test@example.org",
      subject: "support",
      message: "Help",
    };
    expect(isSupportMessageValid(valid)).toBe(true);
    for (const change of [
      { name: "" },
      { name: "x".repeat(101) },
      { name: "x\rheader" },
      { email: "invalid" },
      { email: "x".repeat(255) },
      { subject: "unknown" },
      { message: "" },
      { message: "x".repeat(4001) },
    ]) {
      expect(isSupportMessageValid({ ...valid, ...change })).toBe(false);
    }
  });
});
