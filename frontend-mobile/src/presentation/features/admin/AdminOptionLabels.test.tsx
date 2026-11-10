import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/shared/i18n/locales/en-US.json";
import es from "@/shared/i18n/locales/es-AR.json";
import { ChipRow as EventChips } from "./AdminEventSheetFields";
import { AdminRouteSheetDetailsSection } from "./AdminRouteSheetDetailsSection";
import { AdminWineCompositionFields, AdminWineGeneralFields } from "./AdminWineSheetSections";
import { toForm } from "./AdminWineSheet.contracts";
import { toEditable } from "./AdminRouteSheet.contracts";
import { WineryLocationSection } from "./AdminWinerySheetFields";
import { ScrollView, StyleSheet } from "react-native";
import { useForm, type UseFormReturn } from "react-hook-form";
import type { AdminWineDraft } from "@/domain/admin/adminWineDraft";
import type { AdminRouteDraft } from "@/domain/admin/adminRouteDraft";
import { AdminWineTasteTab } from "./AdminWineSheetTasteTab";

jest.mock("@/presentation/components/ui/ImageWithFallback", () => ({ ImageWithFallback: "Image" }));
jest.mock("react-native-maps", () => ({ __esModule: true, default: "View", Marker: "View" }));
jest.mock("@/presentation/components/ui/Button", () => ({ Button: "Text" }));
jest.mock("@/presentation/components/ui/TextField", () => ({ TextField: "TextInput" }));
jest.mock("@/presentation/hooks/queries/admin", () => ({
  useAdminWinerySearch: () => ({ currentData: undefined, isFetching: false }),
}));
jest.mock("@/presentation/hooks/queries/wine/useGrapeTypes", () => ({
  useGrapeTypes: () => ({ data: [], isLoading: false }),
}));
jest.mock("@/presentation/hooks/ui", () => ({
  useDebounce: (value: string) => value,
  useHaptics: () => ({ selection: jest.fn() }),
}));

let wineForm: UseFormReturn<AdminWineDraft> | null = null;
function WineFields() {
  const form = useForm<AdminWineDraft>({ defaultValues: { ...toForm(), wineType: "WHITE" } });
  wineForm = form;
  return (
    <>
      <AdminWineGeneralFields form={form} isEdit={false} />
      <AdminWineCompositionFields form={form} />
    </>
  );
}
let routeForm: UseFormReturn<AdminRouteDraft> | null = null;
function RouteFields() {
  const form = useForm<AdminRouteDraft>({ defaultValues: toEditable() });
  routeForm = form;
  return <AdminRouteSheetDetailsSection form={form} />;
}
async function instance() {
  const i18n = createInstance();
  await i18n
    .use(initReactI18next)
    .init({
      lng: "en-US",
      fallbackLng: false,
      resources: { "en-US": { translation: en }, "es-AR": { translation: es } },
      interpolation: { escapeValue: false },
    });
  return i18n;
}
it("translates event states and keeps the original API value on selection", async () => {
  const i18n = await instance();
  const select = jest.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <EventChips
        label="Status"
        options={["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]}
        value="DRAFT"
        namespace="status"
        onSelect={select}
      />
    </I18nextProvider>,
  );
  fireEvent.press(screen.getByText("Published"));
  expect(select).toHaveBeenCalledWith("PUBLISHED");
  expect(screen.queryByText("PUBLISHED")).toBeNull();
  await act(async () => {
    await i18n.changeLanguage("es-AR");
  });
  expect(screen.getByText("Publicado")).toBeTruthy();
});
it("translates route states, duration and wine types without changing saved values", async () => {
  const i18n = await instance();
  render(
    <I18nextProvider i18n={i18n}>
      <RouteFields />
    </I18nextProvider>,
  );
  fireEvent.press(screen.getByText("Active"));
  expect(routeForm?.getValues("status")).toBe("active");
  fireEvent.press(screen.getByText("Short"));
  expect(routeForm?.getValues("difficulty")).toBe("short");
  fireEvent.press(screen.getByText("Red"));
  expect(routeForm?.getValues("recommendedWineTypes")).toEqual(["RED"]);
  await act(async () => {
    await i18n.changeLanguage("es-AR");
  });
  expect(screen.getByText("Activa")).toBeTruthy();
  expect(screen.getByText("Corta")).toBeTruthy();
  expect(screen.getByText("Tinto")).toBeTruthy();
});

it("translates wine and allergen options while preserving the selected catalog codes", async () => {
  const i18n = await instance();
  render(
    <I18nextProvider i18n={i18n}>
      <WineFields />
    </I18nextProvider>,
  );
  fireEvent.press(screen.getByText("Red"));
  expect(wineForm?.getValues("wineType")).toBe("RED");
  fireEvent.press(screen.getByText("Fish"));
  expect(wineForm?.getValues("allergens")).toEqual(["FISH"]);
  expect(screen.getByText("Nuts")).toBeTruthy();
  await act(async () => {
    await i18n.changeLanguage("es-AR");
  });
  expect(screen.getByText("Tinto")).toBeTruthy();
  expect(screen.getByText("Pescado")).toBeTruthy();
  expect(screen.getByText("Frutos secos")).toBeTruthy();
});

it("wraps the allergen options instead of running them off the screen", async () => {
  const i18n = await instance();
  render(
    <I18nextProvider i18n={i18n}>
      <WineFields />
    </I18nextProvider>,
  );
  expect(screen.getByText("Fish")).toBeTruthy();
  expect(screen.UNSAFE_queryAllByType(ScrollView).filter((node) => node.props.horizontal)).toHaveLength(0);
});

it("describes the winery map search as an address search", async () => {
  const i18n = await instance();
  render(
    <I18nextProvider i18n={i18n}>
      <WineryLocationSection
        searchAddress=""
        setSearchAddress={jest.fn()}
        runGeocode={jest.fn(async () => undefined)}
        isGeocoding={false}
        latitude={null}
        longitude={null}
        wineryName="Bodega"
        onMarkerDragEnd={jest.fn()}
      />
    </I18nextProvider>,
  );
  expect(screen.getByPlaceholderText("Search for an address or place…")).toBeTruthy();
});

it("lets the full profile shortcut wrap beside the section title", async () => {
  const i18n = await instance();
  await i18n.changeLanguage("es-AR");
  render(
    <I18nextProvider i18n={i18n}>
      <AdminWineTasteTab form={toForm()} patch={jest.fn()} editingWineId="wine" onOpenAiProfile={jest.fn()} />
    </I18nextProvider>,
  );
  const label = screen.getByText("Editar perfil experto completo");
  expect(StyleSheet.flatten(label.props.style)).toMatchObject({ flexShrink: 1 });
  expect(StyleSheet.flatten(label.parent?.parent?.props.style)).toMatchObject({ flexShrink: 1 });
});
