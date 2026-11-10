import * as Location from "expo-location";
import { Platform } from "react-native";
import { locationGateway } from "./location.gateway";

jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

const coordinates = { latitude: -34.6, longitude: -58.4 };
const position = { coords: coordinates } as Location.LocationObject;
function permission(granted: boolean, canAskAgain = true): Location.LocationPermissionResponse {
  return { granted, canAskAgain, status: granted ? "granted" : "denied", expires: "never" } as Location.LocationPermissionResponse;
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.replaceProperty(Platform, "OS", "android");
});
afterEach(() => jest.restoreAllMocks());

it("preserves the existing iOS permission and fresh-position flow", async () => {
  jest.replaceProperty(Platform, "OS", "ios");
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(permission(true));
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue(position);
  await expect(locationGateway.requestForegroundPermission()).resolves.toBe(true);
  await expect(locationGateway.getCurrentPosition()).resolves.toEqual(coordinates);
  expect(Location.getForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(Location.getLastKnownPositionAsync).not.toHaveBeenCalled();
});

it("reuses an existing grant on reopening without requesting permission again", async () => {
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue(permission(true));
  jest.mocked(Location.getLastKnownPositionAsync).mockResolvedValue(position);
  await expect(locationGateway.requestForegroundPermission()).resolves.toBe(true);
  await expect(locationGateway.getCurrentPosition()).resolves.toEqual(coordinates);
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  expect(Location.getLastKnownPositionAsync).toHaveBeenCalledWith({ maxAge: 300_000, requiredAccuracy: 1000 });
});

it.each([true, false])("requests permission when allowed and returns the user's answer: %s", async granted => {
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue(permission(false));
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(permission(granted));
  await expect(locationGateway.requestForegroundPermission()).resolves.toBe(granted);
  expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
});

it("does not prompt after a permanent denial", async () => {
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue(permission(false, false));
  await expect(locationGateway.requestForegroundPermission()).resolves.toBe(false);
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
});

it.each(["missing", "failure"])("requests a fresh position when the recent fix is %s", async outcome => {
  if (outcome === "missing") jest.mocked(Location.getLastKnownPositionAsync).mockResolvedValue(null);
  else jest.mocked(Location.getLastKnownPositionAsync).mockRejectedValue(new Error("Cache unavailable"));
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue(position);
  await expect(locationGateway.getCurrentPosition()).resolves.toEqual(coordinates);
  expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: Location.Accuracy.Balanced });
});

it("propagates a fresh-position failure for application normalization", async () => {
  jest.mocked(Location.getLastKnownPositionAsync).mockResolvedValue(null);
  jest.mocked(Location.getCurrentPositionAsync).mockRejectedValue(new Error("GPS unavailable"));
  await expect(locationGateway.getCurrentPosition()).rejects.toThrow("GPS unavailable");
});

it("maps country codes and handles missing geocoding data", async () => {
  jest.mocked(Location.reverseGeocodeAsync).mockResolvedValueOnce([
    { country: "Argentina", isoCountryCode: "AR" } as Location.LocationGeocodedAddress,
  ]).mockResolvedValueOnce([{} as Location.LocationGeocodedAddress]).mockResolvedValueOnce([]);
  await expect(locationGateway.reverseGeocode(coordinates)).resolves.toEqual({ country: "Argentina", isoCountryCode: "AR" });
  await expect(locationGateway.reverseGeocode(coordinates)).resolves.toEqual({ country: null, isoCountryCode: null });
  await expect(locationGateway.reverseGeocode(coordinates)).resolves.toBeNull();
});
