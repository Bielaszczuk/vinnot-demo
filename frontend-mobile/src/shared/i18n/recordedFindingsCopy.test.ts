import { describe, expect, it } from "@jest/globals";
import i18next, { type TFunction } from "i18next";
import esAR from "./locales/es-AR.json";
import enUS from "./locales/en-US.json";

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

describe("counts", () => {
  it("uses the singular for one item in every admin list", async () => {
    const es = await translator("es-AR");
    const en = await translator("en-US");
    const singular: Array<[string, string, string]> = [
      ["common.resultCount", "1 resultado", "1 result"],
      ["admin.wines.count", "1 vino", "1 wine"],
      ["admin.wineries.count", "1 bodega", "1 winery"],
      ["admin.users.count", "1 usuario", "1 user"],
      ["admin.events.count", "1 evento", "1 event"],
      ["admin.routes.count", "1 ruta", "1 route"],
      ["admin.reviews.count", "1 reseña", "1 review"],
      ["admin.routes.daysCount", "1 día", "1 day"],
      ["wineRoutes.availableCount", "1 ruta disponible", "1 route available"],
      ["partner.eventCount", "1 evento", "1 event"],
    ];
    for (const [key, spanish, english] of singular) {
      expect(es(key, { count: 1 })).toBe(spanish);
      expect(en(key, { count: 1 })).toBe(english);
    }
    expect(es("admin.users.count", { count: 3 })).toBe("3 usuarios");
    expect(es("admin.routes.daysCount", { count: 2 })).toBe("2 días");
    expect(en("wineRoutes.availableCount", { count: 4 })).toBe("4 routes available");
  });

  it("formats large counts with the app language", async () => {
    const es = await translator("es-AR");
    const en = await translator("en-US");
    expect(es("common.resultCount", { count: 1721494 })).toBe("1.721.494 resultados");
    expect(en("common.resultCount", { count: 1721494 })).toBe("1,721,494 results");
    expect(es("admin.wines.count", { count: 1721494 })).toBe("1.721.494 vinos");
    expect(en("admin.wines.count", { count: 1721494 })).toBe("1,721,494 wines");
  });
});

describe("admin wording", () => {
  it("suspends and reactivates accounts, distinct from blocking another person", () => {
    expect(esAR.admin.users.ban).toBe("Suspender");
    expect(esAR.admin.users.unban).toBe("Reactivar");
    expect(esAR.admin.users.statusLabels.locked).toBe("Suspendida");
    expect(esAR.admin.users.confirmBanTitle).toBe("Suspender cuenta");
    expect(esAR.admin.users.confirmUnbanTitle).toBe("Reactivar cuenta");
    expect(enUS.admin.users.ban).toBe("Suspend");
    expect(enUS.admin.users.unban).toBe("Reactivate");
    expect(enUS.admin.users.statusLabels.locked).toBe("Suspended");
    expect(esAR.community.block).toBe("Bloquear usuario");
  });

  it("speaks plain product language in the admin panel and route form", () => {
    expect(esAR.admin.actions.manageWineriesDesc).toBe("Crear, editar y eliminar bodegas");
    expect(enUS.admin.actions.manageWineriesDesc).toBe("Create, edit and delete wineries");
    expect(esAR.admin.routes.mapEmbedUrl).toBe("URL del mapa embebido");
    expect(enUS.admin.routes.mapEmbedUrl).toBe("Map embed URL");
  });

  it("describes the winery location search as an address search", () => {
    expect(esAR.admin.wineries.locationSearchPlaceholder).toBe("Buscar una dirección o un lugar…");
    expect(enUS.admin.wineries.locationSearchPlaceholder).toBe("Search for an address or place…");
  });

  it("labels the delete review button as an action and keeps the question for the dialog", () => {
    expect(esAR.admin.reviews.deleteAction).toBe("Eliminar reseña");
    expect(enUS.admin.reviews.deleteAction).toBe("Delete review");
    expect(esAR.admin.reviews.deleteTitle).toBe("¿Eliminar reseña?");
  });

  it("names the admin event action as a cancellation", async () => {
    expect((await translator("es-AR"))("admin.common.cancelEventItem", { name: "Cata" })).toBe("Cancelar evento Cata");
    expect((await translator("en-US"))("admin.common.cancelEventItem", { name: "Cata" })).toBe("Cancel event Cata");
  });

  it("counts the events an organizer runs", () => {
    expect(esAR.profile.organizedEvents).toBe("Eventos organizados");
    expect(enUS.profile.organizedEvents).toBe("Events organized");
  });
});

describe("wine types", () => {
  it("calls orange wine Naranja, like the reference table and the web", () => {
    expect(esAR.wines.types.orange).toBe("Naranja");
    expect(esAR.wines.types.ORANGE).toBe("Naranja");
  });
});
