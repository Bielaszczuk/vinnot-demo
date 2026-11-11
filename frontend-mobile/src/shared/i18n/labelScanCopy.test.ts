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

const BACK_LABEL_AND_BARCODE_KEYS = [
  "scan.scanBackLabel",
  "scan.scanBackLabelDescription",
  "scan.backLabelHeadline",
  "scan.backLabelHint",
  "scan.backLabelCancel",
  "scan.barcodeDetected",
] as const;

describe("label scan back label and barcode copy", () => {
  it("has Spanish and English text for every key, never the same Spanish text in English", async () => {
    const es = await translator("es-AR");
    const en = await translator("en-US");
    for (const key of BACK_LABEL_AND_BARCODE_KEYS) {
      expect(es(key)).not.toBe(key);
      expect(en(key)).not.toBe(key);
      expect(en(key)).not.toBe(es(key));
    }
  });

  it("names the back label action plainly in both languages", async () => {
    expect((await translator("es-AR"))("scan.scanBackLabel")).toBe("Escanear la contraetiqueta");
    expect((await translator("en-US"))("scan.scanBackLabel")).toBe("Scan the back label");
  });
});
