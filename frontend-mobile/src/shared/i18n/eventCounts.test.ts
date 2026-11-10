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

describe("event counts copy", () => {
  it("uses the singular for one event or attendee and the plural otherwise", async () => {
    const es = await translator("es-AR");
    const en = await translator("en-US");

    expect(es("events.availableCount", { count: 1, value: 1 })).toBe("1 evento disponible");
    expect(es("events.availableCount", { count: 3, value: 3 })).toBe("3 eventos disponibles");
    expect(en("events.availableCount", { count: 1, value: 1 })).toBe("1 event available");
    expect(en("events.availableCount", { count: 0, value: 0 })).toBe("0 events available");

    expect(es("events.attendeeCount", { count: 1, value: "1" })).toBe("1 asistente");
    expect(en("events.attendeeCount", { count: 20, value: "1/20" })).toBe("1/20 attendees");
  });

  it("names the avatar action fully", async () => {
    expect((await translator("es-AR"))("profile.changeAvatar")).toBe("Cambiar foto");
    expect((await translator("en-US"))("profile.changeAvatar")).toBe("Change photo");
  });
});
