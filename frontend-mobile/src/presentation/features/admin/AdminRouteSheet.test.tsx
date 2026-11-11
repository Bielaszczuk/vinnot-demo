import React from "react";
import { Alert, type AlertButton } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { AdminRoute } from "@/domain/admin/admin.types";
import { AdminRouteSheet } from "./AdminRouteSheet";

type SheetProps = {
  onDismiss: () => void;
  enablePanDownToClose: boolean;
  children: React.ReactNode;
  footerComponent?: (props: object) => React.ReactNode;
};
const mockSheet: { props?: SheetProps } = {};
const mockPresent = jest.fn();
const mockPending = { value: false };
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockCreateWinery = jest.fn();
const mockShowError = jest.fn();
const mockGeocode = jest.fn();
const mockWineries = [
  { id: "w-1", name: "Bodega Norte", regionName: "Mendoza", countryName: "Argentina", latitude: -33, longitude: -68, address: "Ruta 40" },
];

const mockLanguage = { value: "es-AR" };
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) => (options?.name ? `${key}(${options.name})` : key),
    i18n: { language: mockLanguage.value },
  }),
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showSuccess: jest.fn(), showError: mockShowError, showToast: jest.fn() }),
}));
jest.mock("@/presentation/hooks/ui", () => ({
  useDebounce: (value: string) => value,
  useHaptics: () => ({ selection: jest.fn() }),
}));
jest.mock("@/presentation/hooks/queries/admin", () => ({
  useAdminRouteMutations: () => ({
    create: { mutateAsync: mockCreate, isPending: mockPending.value },
    update: { mutateAsync: mockUpdate, isPending: false },
  }),
  useAdminWinerySearch: (search: string) => ({
    currentData: {
      items: search.trim().length >= 2
        ? mockWineries.filter((winery) => winery.name.toLowerCase().includes(search.trim().toLowerCase()))
        : [],
    },
    isFetching: false,
  }),
  useAdminWineryMutations: () => ({ create: { mutateAsync: mockCreateWinery, isPending: false } }),
  useAdminCountries: () => ({
    data: [
      { id: "country-ar", code: "AR", name: "Argentina" },
      { id: "country-cl", code: "CL", name: "Chile" },
      { id: "country-es", code: "ES", name: "España" },
    ],
  }),
  useAdminRegions: (countryId?: string) => ({
    data: countryId === "country-ar" ? [{ id: "region-mza", name: "Mendoza" }, { id: "region-sal", name: "Salta" }]
      : countryId === "country-cl" ? [{ id: "region-mai", name: "Maipo" }] : [],
    isFetching: false,
  }),
}));
jest.mock("@/presentation/hooks/useGeocoding", () => ({
  useGeocoding: () => ({ geocodeAddress: mockGeocode, isGeocoding: false }),
}));
jest.mock("@/presentation/components/features/media/CoverImagePicker", () => ({ CoverImagePicker: () => null }));
jest.mock("@/presentation/components/features/location/LocationPickerMap", () => ({ LocationPickerMap: () => null }));
jest.mock("react-native-maps", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  const MapView = mockReact.forwardRef((props: { children?: React.ReactNode }, ref) => {
    mockReact.useImperativeHandle(ref, () => ({ fitToCoordinates: jest.fn() }));
    return mockReact.createElement("View", null, props.children);
  });
  return { __esModule: true, default: MapView, Marker: "View", Polyline: "View" };
});
jest.mock("@/presentation/components/ui/TextField", () => {
  const { Text, TextInput, View } = jest.requireActual("react-native");
  return {
    TextField: ({ label, accessibilityLabel, error, ...props }: {
      label?: string;
      accessibilityLabel?: string;
      error?: string;
    }) => (
      <View>
        <TextInput {...props} accessibilityLabel={label ?? accessibilityLabel} />
        {error ? <Text>{error}</Text> : null}
      </View>
    ),
  };
});
jest.mock("@/presentation/components/ui/BottomSheet", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: mockReact.forwardRef(({ children }: { children: React.ReactNode }, ref) => {
      mockReact.useImperativeHandle(ref, () => ({ scrollTo: jest.fn() }));
      return children;
    }),
    BottomSheetStickyFooter: ({ children }: { children: React.ReactNode }) => children,
    BottomSheetModal: mockReact.forwardRef((props: SheetProps, ref) => {
      mockReact.useImperativeHandle(ref, () => ({ present: mockPresent, dismiss: jest.fn() }));
      mockSheet.props = props;
      return (
        <>
          {props.children}
          {props.footerComponent?.({})}
        </>
      );
    }),
  };
});

const route: AdminRoute = {
  id: "route-1",
  name: "Ruta del Valle",
  description: "Bodegas de altura",
  country: "Argentina",
  region: "Mendoza",
  subregion: "Valle de Uco",
  estimatedDuration: 90,
  estimatedDays: 2,
  totalDistance: 120.5,
  difficulty: "medium",
  imageUrl: "https://cdn.vinnot.com/route.jpg",
  mapEmbedUrl: "https://maps.example.com/embed",
  status: "active",
  recommendedWineTypes: ["RED"],
  stops: [
    { id: "s-2", name: "Mirador", description: "", type: "viewpoint", address: "", latitude: null, longitude: null, stopOrder: 2, estimatedDuration: 30 },
    { id: "s-1", name: "Bodega Norte", description: "Bodega en Mendoza", type: "winery", address: "Ruta 40", latitude: -33, longitude: -68, stopOrder: 1, estimatedDuration: 60 },
  ],
  createdAt: "2026-05-30T10:00:00.000Z",
};

const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
const pressAlert = (label: string) => {
  const buttons = alert.mock.calls.at(-1)?.[2] as AlertButton[];
  act(() => buttons.find((button) => button.text === label)?.onPress?.());
};
const pressAsync = async (label: string) => {
  await act(async () => {
    fireEvent.press(screen.getByText(label));
  });
};
const pick = (picker: string, search: string, query: string, option: string) => {
  fireEvent.press(screen.getByRole("combobox", { name: picker }));
  fireEvent.changeText(screen.getByLabelText(search), query);
  fireEvent.press(screen.getByRole("button", { name: option }));
};
const searchStopWinery = (query: string) => {
  fireEvent.press(screen.getByRole("combobox", { name: "admin.routes.searchWinery" }));
  fireEvent.changeText(screen.getByLabelText("admin.routes.searchWineryPlaceholder"), query);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPending.value = false;
  mockLanguage.value = "es-AR";
  mockCreate.mockResolvedValue({});
  mockUpdate.mockResolvedValue({});
  mockGeocode.mockResolvedValue({ ok: false, status: "ZERO_RESULTS" });
});

describe("sections", () => {
  it("groups the route in details, location, stops and media sections with a required name", () => {
    render(<AdminRouteSheet visible onClose={jest.fn()} />);
    for (const section of ["details", "location", "stops", "media"]) {
      expect(screen.getByText(`admin.routes.sections.${section}`)).toBeTruthy();
    }
    expect(screen.getByLabelText("admin.routes.name").props.required).toBe(true);
    expect(screen.getByRole("combobox", { name: "admin.routes.country" })).toBeTruthy();
    expect(screen.queryByLabelText("admin.routes.mapEmbedUrl")).toBeNull();
  });

  it("shows the resolver errors inline and does not save", async () => {
    render(<AdminRouteSheet visible onClose={jest.fn()} />);
    await pressAsync("admin.routes.createRoute");
    expect(screen.getByText("forms.fixErrors")).toBeTruthy();
    expect(screen.getByText("admin.routes.validation.nameRequired")).toBeTruthy();
    expect(screen.getByText("admin.routes.validation.countryRequired")).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("opens the media section and Advanced to show a too long map URL", async () => {
    render(<AdminRouteSheet visible editingRoute={{ ...route, mapEmbedUrl: "m".repeat(1001) }} onClose={jest.fn()} />);
    expect(screen.queryByLabelText("admin.routes.mapEmbedUrl")).toBeNull();
    await pressAsync("common.saveChanges");
    expect(screen.getByLabelText("admin.routes.mapEmbedUrl")).toBeTruthy();
    expect(screen.getByText("admin.routes.validation.mapEmbedUrlTooLong")).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("keeps the raw map URL behind Advanced", () => {
    render(<AdminRouteSheet visible editingRoute={route} onClose={jest.fn()} />);
    fireEvent.press(screen.getByText("admin.routes.sections.media"));
    expect(screen.queryByLabelText("admin.routes.mapEmbedUrl")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "admin.routes.advanced" }));
    expect(screen.getByLabelText("admin.routes.mapEmbedUrl").props.value).toBe("https://maps.example.com/embed");
  });
});

describe("details", () => {
  it("highlights every chosen recommended type and saves them", async () => {
    render(<AdminRouteSheet visible editingRoute={route} onClose={jest.fn()} />);
    expect(screen.getByRole("checkbox", { name: "wines.types.RED" }).props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByRole("checkbox", { name: "wines.types.WHITE" }).props.accessibilityState).toMatchObject({ checked: false });
    fireEvent.press(screen.getByRole("checkbox", { name: "wines.types.WHITE" }));
    expect(screen.getByRole("checkbox", { name: "wines.types.WHITE" }).props.accessibilityState).toMatchObject({ checked: true });
    await pressAsync("common.saveChanges");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ recommendedWineTypes: ["RED", "WHITE"] }) }),
    );
  });

  it("picks the country, offers only its regions and clears the region on a new country", async () => {
    render(<AdminRouteSheet visible onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText("admin.routes.name"), "Ruta Nueva");
    expect(screen.getByRole("combobox", { name: "admin.routes.region" })).toBeDisabled();
    pick("admin.routes.country", "admin.routes.countrySearch", "chi", "Chile");
    pick("admin.routes.region", "admin.routes.regionSearch", "mai", "Maipo");
    pick("admin.routes.country", "admin.routes.countrySearch", "arg", "Argentina");
    expect(screen.getByRole("combobox", { name: "admin.routes.region" }).props.accessibilityValue).toEqual({
      text: "common.selectRegion",
    });
    pick("admin.routes.region", "admin.routes.regionSearch", "sal", "Salta");
    await pressAsync("admin.routes.createRoute");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ruta Nueva", country: "Argentina", region: "Salta", status: "draft" }),
    );
  });

  it("shows countries in English but saves the stored catalog name", async () => {
    mockLanguage.value = "en-US";
    render(<AdminRouteSheet visible onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText("admin.routes.name"), "Ruta Nueva");
    pick("admin.routes.country", "admin.routes.countrySearch", "spa", "Spain");
    await pressAsync("admin.routes.createRoute");
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ country: "España" }));
  });
});

describe("stops", () => {
  it("adds a catalog winery as a stop from the search", async () => {
    render(<AdminRouteSheet visible editingRoute={{ ...route, stops: [] }} onClose={jest.fn()} />);
    searchStopWinery("norte");
    fireEvent.press(screen.getByRole("button", { name: "Bodega Norte" }));
    expect(screen.getByText("Bodega Norte")).toBeTruthy();
    await pressAsync("common.saveChanges");
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        stops: [expect.objectContaining({ name: "Bodega Norte", type: "winery", latitude: -33, longitude: -68, stopOrder: 1 })],
      }),
    }));
  });

  it("creates a missing winery from the stop search and adds it as a stop", async () => {
    mockCreateWinery.mockResolvedValue({ id: "w-new", name: "Bodega Nueva", countryName: "Argentina", regionName: null, latitude: null, longitude: null });
    mockGeocode.mockResolvedValue({ ok: true, location: { latitude: -32.9, longitude: -68.8, formattedAddress: "Luján de Cuyo" } });
    render(<AdminRouteSheet visible editingRoute={{ ...route, stops: [] }} onClose={jest.fn()} />);
    searchStopWinery("Bodega Nueva");
    expect(screen.getByText("admin.routes.noWineriesFound")).toBeTruthy();
    fireEvent.press(screen.getByText("admin.wines.createWineryNamed(Bodega Nueva)"));
    expect(screen.getByLabelText("admin.wineries.name").props.value).toBe("Bodega Nueva");
    await pressAsync("admin.wines.inlineWinery.submit");

    expect(mockCreateWinery).toHaveBeenCalledWith({ name: "Bodega Nueva", countryId: "country-ar", regionId: null });
    await waitFor(() => expect(screen.queryByTestId("inline-winery-creator")).toBeNull());
    expect(screen.getByText("Bodega Nueva")).toBeTruthy();
    expect(mockGeocode).toHaveBeenCalledWith("Bodega Nueva, Argentina");
    await pressAsync("common.saveChanges");
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        stops: [expect.objectContaining({ name: "Bodega Nueva", type: "winery", latitude: -32.9, longitude: -68.8, stopOrder: 1 })],
      }),
    }));
  });

  it("adds a manual stop through labelled fields and explains a missing name inline", async () => {
    render(<AdminRouteSheet visible editingRoute={{ ...route, stops: [] }} onClose={jest.fn()} />);
    fireEvent.press(screen.getByText("admin.routes.addManualStopCta"));
    expect(screen.getByText("admin.routes.validation.stopNameRequired")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("admin.routes.stopName"), "Mirador del Valle");
    fireEvent.press(screen.getByRole("radio", { name: "admin.routes.stopTypes.viewpoint" }));
    fireEvent.changeText(screen.getByLabelText("admin.routes.stopAddress"), "Ruta 89 km 12");
    fireEvent.changeText(screen.getByLabelText("admin.routes.stopDuration"), "45");
    fireEvent.changeText(screen.getByLabelText("admin.routes.stopDescription"), "Vista a los Andes");
    fireEvent.press(screen.getByText("admin.routes.addManualStopCta"));

    expect(screen.queryByText("admin.routes.validation.stopNameRequired")).toBeNull();
    expect(screen.getByLabelText("admin.routes.stopName").props.value).toBe("");
    await pressAsync("common.saveChanges");
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        estimatedDuration: 45,
        stops: [{
          name: "Mirador del Valle", description: "Vista a los Andes", type: "viewpoint", address: "Ruta 89 km 12",
          latitude: null, longitude: null, stopOrder: 1, estimatedDuration: 45,
        }],
      }),
    }));
  });
});

describe("payload", () => {
  it("saves an untouched existing route with exactly the previous payload", async () => {
    const onClose = jest.fn();
    render(<AdminRouteSheet visible editingRoute={route} onClose={onClose} />);
    await pressAsync("common.saveChanges");
    expect(mockUpdate).toHaveBeenCalledWith({
      id: "route-1",
      payload: {
        name: "Ruta del Valle",
        description: "Bodegas de altura",
        country: "Argentina",
        region: "Mendoza",
        subregion: "Valle de Uco",
        estimatedDuration: 90,
        estimatedDays: 2,
        totalDistance: 120.5,
        difficulty: "medium",
        imageUrl: "https://cdn.vinnot.com/route.jpg",
        mapEmbedUrl: "https://maps.example.com/embed",
        status: "active",
        recommendedWineTypes: ["RED"],
        stops: [route.stops![1], route.stops![0]],
      },
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("dismiss guard", () => {
  it("asks before a swipe throws away an edited route and re-opens it on keep editing", () => {
    const onClose = jest.fn();
    render(<AdminRouteSheet visible editingRoute={route} onClose={onClose} />);
    fireEvent.changeText(screen.getByLabelText("admin.routes.name"), "Ruta del Valle Alto");
    act(() => mockSheet.props!.onDismiss());
    pressAlert("common.unsavedChanges.keepEditing");
    expect(onClose).not.toHaveBeenCalled();
    expect(mockPresent).toHaveBeenCalled();
    expect(screen.getByLabelText("admin.routes.name").props.value).toBe("Ruta del Valle Alto");
    fireEvent.press(screen.getByText("common.cancel"));
    pressAlert("common.unsavedChanges.discard");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("treats a removed stop as an unsaved change", () => {
    const onClose = jest.fn();
    render(<AdminRouteSheet visible editingRoute={route} onClose={onClose} />);
    fireEvent.press(screen.getByRole("button", { name: "admin.routes.removeStop(Mirador)" }));
    act(() => mockSheet.props!.onDismiss());
    expect(alert).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes an untouched sheet directly and cannot be swiped away while saving", () => {
    const onClose = jest.fn();
    const { rerender } = render(<AdminRouteSheet visible editingRoute={route} onClose={onClose} />);
    act(() => mockSheet.props!.onDismiss());
    expect(alert).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    mockPending.value = true;
    rerender(<AdminRouteSheet visible editingRoute={route} onClose={onClose} />);
    expect(mockSheet.props!.enablePanDownToClose).toBe(false);
  });
});

describe("saving", () => {
  it("saves once when save is tapped twice while the first save is running", async () => {
    let finish: () => void = () => {};
    mockUpdate.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    render(<AdminRouteSheet visible editingRoute={route} onClose={jest.fn()} />);
    const save = screen.getByText("common.saveChanges");
    await act(async () => {
      fireEvent.press(save);
      fireEvent.press(save);
    });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });

  it("explains a duplicate route with the backend error code", async () => {
    mockUpdate.mockRejectedValue({ code: "DUPLICATE_ENTRY" });
    const onClose = jest.fn();
    render(<AdminRouteSheet visible editingRoute={route} onClose={onClose} />);
    await pressAsync("common.saveChanges");
    expect(mockShowError).toHaveBeenCalledWith("forms.errors.duplicate");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("falls back to the route save error for an unknown failure", async () => {
    mockUpdate.mockRejectedValue(new Error("boom"));
    render(<AdminRouteSheet visible editingRoute={route} onClose={jest.fn()} />);
    await pressAsync("common.saveChanges");
    expect(mockShowError).toHaveBeenCalledWith("admin.routes.saveError");
  });
});
