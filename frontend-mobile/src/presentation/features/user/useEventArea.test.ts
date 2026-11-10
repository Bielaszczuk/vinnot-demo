import { act, renderHook, waitFor } from "@testing-library/react-native";
import { notificationsService } from "@/application/services/notifications.service";
import { useEventArea } from "./useEventArea";

jest.mock("@/application/services/notifications.service", () => ({
  notificationsService: {
    getEventArea: jest.fn(),
    setEventAreaRegion: jest.fn(),
    setApproximateEventArea: jest.fn(),
    findPlace: jest.fn(),
    setEventAreaPoint: jest.fn(),
    clearEventArea: jest.fn(),
  },
}));
const mockRegions = { data: [] as unknown[], isLoading: false, isError: false, refetch: jest.fn() };
const mockUseRegions = jest.fn((_countryId?: string, _enabled?: boolean) => mockRegions);
jest.mock("@/presentation/hooks/queries/wine/useRegions", () => ({
  useRegions: (countryId?: string, enabled?: boolean) => mockUseRegions(countryId, enabled),
}));
const mockShowError = jest.fn();
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showError: mockShowError }),
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const service = notificationsService as jest.Mocked<typeof notificationsService>;
const uco = { id: "r1", name: "Valle de Uco", countryId: "ar", countryCode: "AR", countryName: "Argentina" };
const douro = { id: "r2", name: "Douro", countryId: "pt", countryCode: "PT", countryName: "Portugal" };
const lujan = { id: "r3", name: "Luján de Cuyo", countryId: "ar", countryCode: "AR", countryName: "Argentina" };

beforeEach(() => {
  jest.clearAllMocks();
  mockRegions.data = [douro, uco, lujan];
  mockRegions.isLoading = false;
  mockRegions.isError = false;
  service.getEventArea.mockResolvedValue(null);
});

async function rendered(visible = true) {
  const hook = renderHook(({ open }) => useEventArea(open), { initialProps: { open: visible } });
  if (visible) await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

it("loads the current area only while the sheet is open", async () => {
  service.getEventArea.mockResolvedValue({ kind: "REGION", regionId: "r1", regionName: "Valle de Uco" });
  const hook = await rendered(false);
  expect(service.getEventArea).not.toHaveBeenCalled();

  hook.rerender({ open: true });
  await waitFor(() => expect(hook.result.current.area).toEqual({ kind: "REGION", regionId: "r1", regionName: "Valle de Uco" }));
  expect(hook.result.current.loadFailed).toBe(false);
});

it("reports a failed read and reads again on retry", async () => {
  service.getEventArea.mockRejectedValueOnce(new Error("offline"));
  const hook = await rendered();
  expect(hook.result.current.loadFailed).toBe(true);

  service.getEventArea.mockResolvedValueOnce({ kind: "APPROXIMATE" });
  act(() => hook.result.current.retry());
  await waitFor(() => expect(hook.result.current.area).toEqual({ kind: "APPROXIMATE" }));
  expect(hook.result.current.loadFailed).toBe(false);
});

it("asks the catalogue only when the search opens and lists nothing until the user types", async () => {
  const hook = await rendered();
  expect(mockUseRegions).toHaveBeenLastCalledWith(undefined, false);

  act(() => hook.result.current.toggleRegions());

  expect(mockUseRegions).toHaveBeenLastCalledWith(undefined, true);
  expect(hook.result.current.regionsOpen).toBe(true);
  expect(hook.result.current.matches).toEqual([]);
  expect(hook.result.current.canSearchPlace).toBe(false);
  act(() => hook.result.current.toggleRegions());
  expect(hook.result.current.regionsOpen).toBe(false);
});

it("shows only the matching regions, sorted by country and name", async () => {
  const hook = await rendered();
  act(() => hook.result.current.toggleRegions());

  act(() => hook.result.current.setQuery("de"));

  expect(hook.result.current.matches.map((region) => region.id)).toEqual(["r3", "r1"]);
  expect(hook.result.current.canSearchPlace).toBe(false);
});

it("shows the map only when the catalogue has no match", async () => {
  const hook = await rendered();
  act(() => hook.result.current.toggleRegions());
  expect(hook.result.current.mapShown).toBe(false);

  act(() => hook.result.current.setQuery("Cafayate"));

  expect(hook.result.current.matches).toEqual([]);
  expect(hook.result.current.mapShown).toBe(true);
  expect(hook.result.current.canSearchPlace).toBe(true);
});

it("opens the map on demand while regions match", async () => {
  const hook = await rendered();
  act(() => hook.result.current.toggleRegions());
  act(() => hook.result.current.setQuery("Uco"));
  expect(hook.result.current.mapShown).toBe(false);

  act(() => hook.result.current.openMap());

  expect(hook.result.current.mapShown).toBe(true);
  expect(hook.result.current.canSearchPlace).toBe(true);
});

it("moves the pin to a place found on the map without saving it", async () => {
  const cafayate = { latitude: -26.0729, longitude: -65.9762, name: "Cafayate, Salta, Argentina" };
  service.findPlace.mockResolvedValue({ ok: true, place: cafayate });
  const hook = await rendered();
  act(() => hook.result.current.toggleRegions());
  act(() => hook.result.current.setQuery("Cafayate"));

  act(() => hook.result.current.searchPlace());
  expect(hook.result.current.busy).toBe("place");
  await waitFor(() => expect(hook.result.current.busy).toBeNull());

  expect(service.findPlace).toHaveBeenCalledWith("Cafayate");
  expect(hook.result.current.pin).toEqual(cafayate);
  expect(service.setEventAreaPoint).not.toHaveBeenCalled();
  expect(hook.result.current.area).toBeNull();
  expect(hook.result.current.regionsOpen).toBe(true);
});

it("saves the pin the user placed and closes the search", async () => {
  service.setEventAreaPoint.mockResolvedValue({ kind: "APPROXIMATE" });
  const hook = await rendered();
  act(() => hook.result.current.toggleRegions());
  act(() => hook.result.current.setQuery("Cafayate"));
  act(() => hook.result.current.savePin());
  expect(service.setEventAreaPoint).not.toHaveBeenCalled();

  act(() => hook.result.current.movePin(-26.2, -65.9));
  expect(hook.result.current.pin).toEqual({ latitude: -26.2, longitude: -65.9 });
  act(() => hook.result.current.savePin());
  expect(hook.result.current.busy).toBe("point");
  await waitFor(() => expect(hook.result.current.busy).toBeNull());

  expect(service.setEventAreaPoint).toHaveBeenCalledWith({ latitude: -26.2, longitude: -65.9 });
  expect(hook.result.current.area).toEqual({ kind: "APPROXIMATE" });
  expect(hook.result.current.regionsOpen).toBe(false);
  expect(hook.result.current.mapShown).toBe(false);
  expect(hook.result.current.pin).toBeNull();
  expect(hook.result.current.query).toBe("");
});

it("says when the map does not find the place and clears it on a new query", async () => {
  service.findPlace.mockResolvedValue({ ok: false, reason: "not_found" });
  const hook = await rendered();
  act(() => hook.result.current.toggleRegions());
  act(() => hook.result.current.setQuery("Nowhere"));

  act(() => hook.result.current.searchPlace());
  await waitFor(() => expect(hook.result.current.placeFailure).toBe("not_found"));

  expect(hook.result.current.pin).toBeNull();
  expect(hook.result.current.area).toBeNull();
  expect(hook.result.current.regionsOpen).toBe(true);
  expect(mockShowError).not.toHaveBeenCalled();
  act(() => hook.result.current.setQuery("Nowher"));
  expect(hook.result.current.placeFailure).toBeNull();
});

it("saves a region with one tap and closes the list", async () => {
  service.setEventAreaRegion.mockResolvedValue({ kind: "REGION", regionId: "r2", regionName: "Douro" });
  const hook = await rendered();
  act(() => hook.result.current.toggleRegions());

  act(() => hook.result.current.chooseRegion(douro));
  expect(hook.result.current.busy).toBe("region");
  await waitFor(() => expect(hook.result.current.busy).toBeNull());

  expect(service.setEventAreaRegion).toHaveBeenCalledWith(douro);
  expect(hook.result.current.area).toEqual({ kind: "REGION", regionId: "r2", regionName: "Douro" });
  expect(hook.result.current.regionsOpen).toBe(false);
});

it("saves the approximate location", async () => {
  service.setApproximateEventArea.mockResolvedValue({ ok: true, area: { kind: "APPROXIMATE" } });
  const hook = await rendered();

  act(() => hook.result.current.chooseApproximateLocation());
  await waitFor(() => expect(hook.result.current.area).toEqual({ kind: "APPROXIMATE" }));
  expect(hook.result.current.notice).toBeNull();
});

it("explains a denied location calmly and offers the regions", async () => {
  service.setApproximateEventArea.mockResolvedValue({ ok: false, reason: "permission_denied" });
  const hook = await rendered();

  act(() => hook.result.current.chooseApproximateLocation());
  await waitFor(() => expect(hook.result.current.notice).toBe("permission_denied"));

  expect(hook.result.current.area).toBeNull();
  expect(hook.result.current.regionsOpen).toBe(true);
  expect(mockShowError).not.toHaveBeenCalled();
});

it("stops the area and ignores taps while a change is saving", async () => {
  service.getEventArea.mockResolvedValue({ kind: "APPROXIMATE" });
  let finish: () => void = () => undefined;
  service.clearEventArea.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
  const hook = await rendered();

  act(() => hook.result.current.stop());
  act(() => hook.result.current.chooseRegion(uco));
  expect(service.setEventAreaRegion).not.toHaveBeenCalled();
  await act(async () => finish());

  expect(hook.result.current.area).toBeNull();
  expect(hook.result.current.busy).toBeNull();
});

it("keeps the previous area and reports a failed save", async () => {
  service.getEventArea.mockResolvedValue({ kind: "APPROXIMATE" });
  service.setEventAreaRegion.mockRejectedValue(new Error("offline"));
  const hook = await rendered();

  act(() => hook.result.current.chooseRegion(uco));
  await waitFor(() => expect(hook.result.current.busy).toBeNull());

  expect(mockShowError).toHaveBeenCalledWith("notificationPreferences.area.saveError");
  expect(hook.result.current.area).toEqual({ kind: "APPROXIMATE" });
});

it("starts over closed when the sheet opens again", async () => {
  service.setApproximateEventArea.mockResolvedValue({ ok: false, reason: "location_unavailable" });
  const hook = await rendered();
  act(() => hook.result.current.chooseApproximateLocation());
  await waitFor(() => expect(hook.result.current.notice).toBe("location_unavailable"));

  hook.rerender({ open: false });
  hook.rerender({ open: true });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));

  expect(hook.result.current.notice).toBeNull();
  expect(hook.result.current.regionsOpen).toBe(false);
  expect(hook.result.current.query).toBe("");
  expect(service.getEventArea).toHaveBeenCalledTimes(2);
});
