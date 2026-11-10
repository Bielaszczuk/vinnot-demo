import enUS from "./locales/en-US.json";
import esAR from "./locales/es-AR.json";

describe("catalog administration copy", () => {
  it("says a deleted wine is gone for good, with what goes with it", () => {
    expect(esAR.admin.wines.deleteMessage).toBe(
      "Esta acción elimina el vino de forma permanente, junto con sus reseñas, su perfil de IA y las entradas en Mi Bodega de cada persona. No se puede deshacer. ¿Continuar?",
    );
    expect(enUS.admin.wines.deleteMessage).toBe(
      "This permanently deletes the wine, along with its reviews, its AI profile and every cellar entry for it. This cannot be undone. Continue?",
    );
  });

  it("says the wines of a deleted winery stay in the catalog", () => {
    expect(esAR.admin.wineries.deleteMessage).toBe(
      "Se eliminará la bodega. Sus vinos siguen en el catálogo, sin bodega asignada. ¿Continuar?",
    );
    expect(enUS.admin.wineries.deleteMessage).toBe(
      "The winery will be deleted. Its wines stay in the catalog with no winery. Continue?",
    );
  });

  it("names the generate action the same way in both languages", () => {
    expect(esAR.wineDetails.generateProfile).toBe("Generar perfil");
    expect(esAR.admin.aiProfile.generateProfile).toBe("Generar perfil");
    expect(enUS.wineDetails.generateProfile).toBe("Generate profile");
    expect(enUS.admin.aiProfile.generateProfile).toBe("Generate profile");
  });
});
