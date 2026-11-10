import { useEffect } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ExternalMapGate } from "./ExternalMapGate";
import { privacyPreferencesService } from "@/application/services/privacyPreferences.service";

const setExternalMapsAllowed = privacyPreferencesService.setExternalMaps;

afterEach(() => setExternalMapsAllowed(false));

it("mounts the map only with permission and unmounts it on revocation", () => {
  setExternalMapsAllowed(false);
  const mount = vi.fn();
  const unmount = vi.fn();
  function MapProbe() {
    useEffect(() => {
      mount();
      return unmount;
    }, []);
    return <div>Map SDK</div>;
  }
  render(
    <ExternalMapGate>
      <MapProbe />
    </ExternalMapGate>,
  );
  expect(mount).not.toHaveBeenCalled();
  expect(screen.queryByText("Map SDK")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button"));
  expect(mount).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Map SDK")).toBeVisible();
  act(() => {
    setExternalMapsAllowed(false);
  });
  expect(unmount).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Map SDK")).not.toBeInTheDocument();
});

it.each([
  ["en-US", "Allow and load maps", "This map connects to Google."],
  ["es-AR", "Permitir y cargar mapas", "Este mapa se conecta con Google."],
] as const)("explains the map provider in %s from the locale files", async (lng, button, notice) => {
  const { createInstance } = await import("i18next");
  const { I18nextProvider, initReactI18next } = await import("react-i18next");
  const en = (await import("@i18n/locales/en-US.json")).default;
  const es = (await import("@i18n/locales/es-AR.json")).default;
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({ lng, resources: { "en-US": { translation: en }, "es-AR": { translation: es } } });
  setExternalMapsAllowed(false);
  render(<I18nextProvider i18n={i18n}><ExternalMapGate><p>Map</p></ExternalMapGate></I18nextProvider>);
  expect(screen.getByRole("button", { name: button })).toBeInTheDocument();
  expect(screen.getByText(new RegExp(notice))).toBeInTheDocument();
});
