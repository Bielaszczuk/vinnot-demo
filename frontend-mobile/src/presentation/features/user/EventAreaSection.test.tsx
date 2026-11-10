import { fireEvent, render, screen } from "@testing-library/react-native";
import { EventAreaSection } from "./EventAreaSection";
import type { useEventArea } from "./useEventArea";

type ViewModel = ReturnType<typeof useEventArea>;
const uco = { id: "r1", name: "Valle de Uco", countryId: "ar", countryCode: "AR", countryName: "Argentina" };
const douro = { id: "r2", name: "Douro", countryId: "pt", countryCode: "PT", countryName: "Portugal" };
let mockVm: ViewModel;
jest.mock("./useEventArea", () => ({ useEventArea: () => mockVm }));
jest.mock("@/presentation/components/ui/Button", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    Button: ({ children, onPress, disabled }: { children: string; onPress: () => void; disabled?: boolean }) => (
      <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}>
        <Text>{children}</Text>
      </Pressable>
    ),
  };
});
jest.mock("@/presentation/components/ui/TextField", () => {
  const { TextInput } = jest.requireActual("react-native");
  return {
    SearchField: (props: Record<string, unknown>) => <TextInput {...props} />,
  };
});

jest.mock("@/presentation/components/features/location/LocationPickerMap", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    LocationPickerMap: ({
      latitude,
      longitude,
      onChange,
    }: {
      latitude: number | null;
      longitude: number | null;
      onChange: (latitude: number, longitude: number) => void;
    }) => (
      <Pressable accessibilityLabel="map" onPress={() => onChange(-26.2, -65.9)}>
        <Text>{latitude == null ? "no pin" : `pin ${latitude},${longitude}`}</Text>
      </Pressable>
    ),
  };
});

function viewModel(overrides: Partial<ViewModel> = {}): ViewModel {
  return {
    t: ((key: string) => key) as ViewModel["t"],
    area: null,
    isLoading: false,
    loadFailed: false,
    retry: jest.fn(),
    busy: null,
    notice: null,
    regionsOpen: false,
    query: "",
    setQuery: jest.fn(),
    matches: [uco, douro],
    mapShown: false,
    openMap: jest.fn(),
    pin: null,
    movePin: jest.fn(),
    savePin: jest.fn(),
    canSearchPlace: false,
    placeFailure: null,
    regionsLoading: false,
    regionsFailed: false,
    retryRegions: jest.fn(),
    chooseApproximateLocation: jest.fn(),
    toggleRegions: jest.fn(),
    chooseRegion: jest.fn(),
    searchPlace: jest.fn(),
    stop: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockVm = viewModel();
});

it("offers both ways to choose an area when there is none", () => {
  render(<EventAreaSection visible />);

  expect(screen.getByText("notificationPreferences.area.none")).toBeTruthy();
  expect(screen.queryByText("notificationPreferences.area.stop")).toBeNull();
  fireEvent.press(screen.getByText("notificationPreferences.area.useLocation"));
  fireEvent.press(screen.getByText("notificationPreferences.area.chooseRegion"));

  expect(mockVm.chooseApproximateLocation).toHaveBeenCalledTimes(1);
  expect(mockVm.toggleRegions).toHaveBeenCalledTimes(1);
});

it("names the chosen region and lets the user stop", () => {
  mockVm = viewModel({ area: { kind: "REGION", regionId: "r1", regionName: "Valle de Uco" } });
  render(<EventAreaSection visible />);

  expect(screen.getByText("Valle de Uco")).toBeTruthy();
  fireEvent.press(screen.getByText("notificationPreferences.area.stop"));
  expect(mockVm.stop).toHaveBeenCalledTimes(1);
});

it("calls an approximate area what it is", () => {
  mockVm = viewModel({ area: { kind: "APPROXIMATE" } });
  render(<EventAreaSection visible />);

  expect(screen.getByText("notificationPreferences.area.approximate")).toBeTruthy();
});

it("names a place picked on the map", () => {
  mockVm = viewModel({ area: { kind: "APPROXIMATE", placeName: "Cafayate, Salta, Argentina" } });
  render(<EventAreaSection visible />);

  expect(screen.getByText("Cafayate, Salta, Argentina")).toBeTruthy();
});

it("searches instead of listing the whole catalogue", () => {
  mockVm = viewModel({ regionsOpen: true, matches: [] });
  render(<EventAreaSection visible />);

  expect(screen.getByText("notificationPreferences.area.searchHint")).toBeTruthy();
  expect(screen.queryByRole("radio")).toBeNull();
  fireEvent.changeText(screen.getByLabelText("notificationPreferences.area.searchLabel"), "uco");
  expect(mockVm.setQuery).toHaveBeenCalledWith("uco");
});

it("shows the map when the catalogue has no match: search moves the pin, a tap adjusts it, one button saves", () => {
  mockVm = viewModel({ regionsOpen: true, query: "Cafayate", matches: [], mapShown: true, canSearchPlace: true });
  const { rerender } = render(<EventAreaSection visible />);

  expect(screen.getByText("notificationPreferences.area.noCatalogMatch")).toBeTruthy();
  expect(screen.getByText("no pin")).toBeTruthy();
  expect(screen.getByRole("button", { name: "notificationPreferences.area.usePoint" }).props.accessibilityState.disabled).toBe(true);
  fireEvent.press(screen.getByText("notificationPreferences.area.searchMap"));
  expect(mockVm.searchPlace).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByLabelText("map"));
  expect(mockVm.movePin).toHaveBeenCalledWith(-26.2, -65.9);

  mockVm = viewModel({
    regionsOpen: true,
    query: "Cafayate",
    matches: [],
    mapShown: true,
    canSearchPlace: true,
    pin: { latitude: -26.07, longitude: -65.97, name: "Cafayate" },
  });
  rerender(<EventAreaSection visible />);
  expect(screen.getByText("pin -26.07,-65.97")).toBeTruthy();
  fireEvent.press(screen.getByText("notificationPreferences.area.usePoint"));
  expect(mockVm.savePin).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("notificationPreferences.area.pickOnMap")).toBeNull();
});

it("explains a place the map cannot find", () => {
  mockVm = viewModel({ regionsOpen: true, query: "Nowhere", matches: [], mapShown: true, canSearchPlace: true, placeFailure: "not_found" });
  const { rerender } = render(<EventAreaSection visible />);
  expect(screen.getByText("notificationPreferences.area.placeNotFound")).toBeTruthy();

  mockVm = viewModel({ regionsOpen: true, query: "Cafayate", matches: [], mapShown: true, canSearchPlace: true, placeFailure: "unavailable" });
  rerender(<EventAreaSection visible />);
  expect(screen.getByText("notificationPreferences.area.placeUnavailable")).toBeTruthy();
});

it("offers the map on demand next to the matching regions", () => {
  mockVm = viewModel({ regionsOpen: true, query: "u" });
  render(<EventAreaSection visible />);

  expect(screen.queryByLabelText("map")).toBeNull();
  expect(screen.queryByText("notificationPreferences.area.searchMap")).toBeNull();
  fireEvent.press(screen.getByText("notificationPreferences.area.pickOnMap"));
  expect(mockVm.openMap).toHaveBeenCalledTimes(1);
});

it("lists the matching regions as one-tap choices and marks the current one", () => {
  mockVm = viewModel({
    area: { kind: "REGION", regionId: "r1", regionName: "Valle de Uco" },
    regionsOpen: true,
    query: "uco",
  });
  render(<EventAreaSection visible />);

  expect(screen.getByRole("radio", { name: "Valle de Uco" }).props.accessibilityState.checked).toBe(true);
  fireEvent.press(screen.getByRole("radio", { name: "Douro" }));
  expect(mockVm.chooseRegion).toHaveBeenCalledWith(douro);
});

it("shows the calm denied message and the region list state", () => {
  mockVm = viewModel({ notice: "permission_denied", regionsOpen: true, regionsLoading: true, matches: [] });
  const { rerender } = render(<EventAreaSection visible />);

  expect(screen.getByText("notificationPreferences.area.permissionDenied")).toBeTruthy();
  expect(screen.getByLabelText("common.loading")).toBeTruthy();

  mockVm = viewModel({ notice: "location_unavailable", regionsOpen: true, regionsFailed: true, matches: [] });
  rerender(<EventAreaSection visible />);
  expect(screen.getByText("notificationPreferences.area.locationUnavailable")).toBeTruthy();
  fireEvent.press(screen.getByText("common.retry"));
  expect(mockVm.retryRegions).toHaveBeenCalledTimes(1);
});

it("disables every choice while saving", () => {
  mockVm = viewModel({ busy: "location", regionsOpen: true, query: "uco", area: { kind: "APPROXIMATE" } });
  render(<EventAreaSection visible />);

  expect(screen.getByRole("radio", { name: "Douro" }).props.accessibilityState.disabled).toBe(true);
  expect(screen.getByRole("button", { name: "notificationPreferences.area.stop" }).props.accessibilityState.disabled).toBe(true);
});

it("shows loading and a failed read with a retry", () => {
  mockVm = viewModel({ isLoading: true });
  const { rerender } = render(<EventAreaSection visible />);
  expect(screen.getByLabelText("common.loading")).toBeTruthy();

  mockVm = viewModel({ loadFailed: true });
  rerender(<EventAreaSection visible />);
  expect(screen.getByText("notificationPreferences.area.loadError")).toBeTruthy();
  fireEvent.press(screen.getByText("common.retry"));
  expect(mockVm.retry).toHaveBeenCalledTimes(1);
});
