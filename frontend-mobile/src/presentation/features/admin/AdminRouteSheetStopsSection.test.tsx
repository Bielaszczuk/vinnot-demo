import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ScrollView } from "react-native";
import type { AdminRouteStop, AdminWinery } from "@/domain/admin/admin.types";
import { AdminRouteSheetStopsSection } from "./AdminRouteSheetStopsSection";
import { emptyManualStop } from "./AdminRouteSheet.contracts";

const mockFitToCoordinates = jest.fn();
jest.mock("react-native-maps", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  const MapView = mockReact.forwardRef((props: { children?: React.ReactNode }, ref) => {
    mockReact.useImperativeHandle(ref, () => ({ fitToCoordinates: mockFitToCoordinates }));
    return mockReact.createElement("View", { testID: "map" }, props.children);
  });
  return { __esModule: true, default: MapView, Marker: "View", Polyline: "View" };
});
jest.mock("@/presentation/components/features/location/LocationPickerMap", () => ({ LocationPickerMap: () => null }));
jest.mock("@/presentation/components/ui/Button", () => ({ Button: "Text" }));
jest.mock("@/presentation/components/ui/TextField", () => ({ TextField: "TextInput" }));
jest.mock("@/presentation/hooks/queries/admin", () => ({
  useAdminWineryMutations: () => ({ create: { mutateAsync: jest.fn(), isPending: false } }),
  useAdminCountries: () => ({ data: [] }),
  useAdminRegions: () => ({ data: [], isFetching: false }),
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const winery = {
  id: "w1", name: "Bodega Norte", regionName: "Mendoza", countryName: "Argentina",
  latitude: -33, longitude: -68,
} as AdminWinery;
const stop = (name: string, latitude: number, longitude: number): AdminRouteStop & { latitude: number; longitude: number } => ({
  name, description: "", type: "winery", address: "", latitude, longitude, stopOrder: 1, estimatedDuration: 60,
});

function props(overrides: Partial<React.ComponentProps<typeof AdminRouteSheetStopsSection>> = {}) {
  return {
    winerySearch: "nor",
    updateWinerySearch: jest.fn(),
    wineryResults: [winery],
    selectWineryAsStop: jest.fn(),
    coordinates: [],
    mapCenter: { latitude: -34, longitude: -58 },
    stops: [],
    geocodingStopIndex: null,
    geocodeQuery: "",
    updateGeocodingStopIndex: jest.fn(),
    updateGeocodeQuery: jest.fn(),
    selectStopLocation: jest.fn(),
    geocodeStop: jest.fn(async () => undefined),
    isGeocoding: false,
    moveStop: jest.fn(),
    removeStop: jest.fn(),
    manualStop: emptyManualStop(),
    updateManualStop: jest.fn(),
    addManualStop: jest.fn(),
    ...overrides,
  } satisfies React.ComponentProps<typeof AdminRouteSheetStopsSection>;
}

beforeEach(() => jest.clearAllMocks());

it("picks a suggestion on the first tap while the keyboard is open", () => {
  const selectWineryAsStop = jest.fn();
  const updateWinerySearch = jest.fn();
  render(<AdminRouteSheetStopsSection {...props({ selectWineryAsStop, updateWinerySearch })} />);
  fireEvent.press(screen.getByRole("combobox", { name: "admin.routes.searchWinery" }));
  fireEvent.changeText(screen.getByPlaceholderText("admin.routes.searchWineryPlaceholder"), "nor");
  expect(updateWinerySearch).toHaveBeenLastCalledWith("nor");
  const list = screen.UNSAFE_getAllByType(ScrollView).find((node) => node.props.nestedScrollEnabled);
  expect(list?.props.keyboardShouldPersistTaps).toBe("handled");
  fireEvent.press(screen.getByText("Bodega Norte"));
  expect(selectWineryAsStop).toHaveBeenCalledWith(winery);
});

it("drops the stale suggestions once the search is cleared by a pick", () => {
  render(<AdminRouteSheetStopsSection {...props({ winerySearch: "" })} />);
  fireEvent.press(screen.getByRole("combobox", { name: "admin.routes.searchWinery" }));
  fireEvent.changeText(screen.getByPlaceholderText("admin.routes.searchWineryPlaceholder"), "nor");
  expect(screen.queryByText("Bodega Norte")).toBeNull();
});

it("refits the map so every stop stays in view", () => {
  const first = stop("Primera", -33, -68);
  const second = stop("Segunda", -41, -71);
  const view = render(<AdminRouteSheetStopsSection {...props({ coordinates: [first], stops: [first] })} />);
  view.rerender(<AdminRouteSheetStopsSection {...props({ coordinates: [first, second], stops: [first, second] })} />);
  expect(mockFitToCoordinates).toHaveBeenLastCalledWith(
    [{ latitude: -33, longitude: -68 }, { latitude: -41, longitude: -71 }],
    expect.objectContaining({ animated: true }),
  );
});
