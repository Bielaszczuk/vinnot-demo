import {
  localizedText,
  resolveAccountLanguage,
  resolveAiContentLanguage,
  resolveSupportedLocale,
} from "./language";

describe("account language", () => {
  it("maps UI locales to the language stored on the account", () => {
    expect(resolveAccountLanguage("en-US")).toBe("en");
    expect(resolveAccountLanguage("es-AR")).toBe("es");
    expect(resolveAccountLanguage("pt-BR")).toBe("es");
    expect(resolveAccountLanguage(undefined)).toBe("es");
  });
});

describe("localized catalog text", () => {
  it("prefers the active language and falls back to the other one", () => {
    expect(localizedText({ es: "Hola", en: "Hello" }, "en-US")).toBe("Hello");
    expect(localizedText({ es: "Hola", en: "Hello" }, "es-AR")).toBe("Hola");
    expect(localizedText({ es: "Hola", en: "  " }, "en")).toBe("Hola");
    expect(localizedText({ es: null, en: "Hello" }, "fr-FR")).toBe("Hello");
    expect(localizedText({}, "en")).toBeNull();
  });
});

describe("i18n language resolution", () => {
  it.each(["en", "en-US", "en-GB", "EN-au"])(
    "maps the English locale %s to supported English",
    (locale) => {
      expect(resolveSupportedLocale(locale)).toBe("en-US");
      expect(resolveAiContentLanguage(locale)).toBe("en");
    },
  );

  it.each(["es", "es-AR", "fr-FR", "pt-BR", undefined, null])(
    "falls back from %s to the product's Spanish locale",
    (locale) => {
      expect(resolveSupportedLocale(locale)).toBe("es-AR");
      expect(resolveAiContentLanguage(locale)).toBe("es");
    },
  );
});
