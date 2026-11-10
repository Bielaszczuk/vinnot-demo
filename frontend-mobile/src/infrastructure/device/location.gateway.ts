import * as Location from "expo-location";
import { Platform } from "react-native";

export interface DeviceCoordinates {
  latitude: number;
  longitude: number;
}

export interface DevicePlace {
  country: string | null;
  isoCountryCode: string | null;
}

export const locationGateway = {
  async requestForegroundPermission(): Promise<boolean> {
    if (Platform.OS === "android") {
      const current = await Location.getForegroundPermissionsAsync();
      if (current.granted) return true;
      if (!current.canAskAgain) return false;
    }
    const permission = await Location.requestForegroundPermissionsAsync();
    return permission.status === "granted";
  },

  async getCurrentPosition(): Promise<DeviceCoordinates> {
    // Reopening the app should not require a new GPS fix when the OS has a
    // recent, sufficiently accurate position. Permission is checked by the service.
    const recent = Platform.OS === "android" ? await Location.getLastKnownPositionAsync({
      maxAge: 5 * 60 * 1000,
      requiredAccuracy: 1000,
    }).catch(() => null) : null;
    const position = recent ?? await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  },

  async reverseGeocode(coordinates: DeviceCoordinates): Promise<DevicePlace | null> {
    const [place] = await Location.reverseGeocodeAsync(coordinates);
    if (!place) return null;

    return {
      country: place.country ?? null,
      isoCountryCode: place.isoCountryCode ?? null,
    };
  },
};
