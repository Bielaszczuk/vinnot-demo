// Hermes/JSC may lack Intl.PluralRules — polyfill for i18next plurals.
import "intl-pluralrules";
/**
 * i18n setup — i18next + react-i18next.
 * Mirrors web: default language es-AR, fallback es-AR, supports en-US.
 * Initialized synchronously (initReactI18next) so no async loading flash.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import esAR from "./locales/es-AR.json";
import enUS from "./locales/en-US.json";
import { resolveSupportedLocale } from "./language";

const deviceLocale = Localization.getLocales()[0]?.languageTag ?? "es-AR";
const lng = resolveSupportedLocale(deviceLocale);

i18n
  .use(initReactI18next)
  .init({
    resources: {
      "es-AR": { translation: esAR },
      "en-US": { translation: enUS },
    },
    lng,
    fallbackLng: "es-AR",
    interpolation: {
      escapeValue: false, // React handles XSS
    },
    compatibilityJSON: "v4",
  });

export default i18n;
