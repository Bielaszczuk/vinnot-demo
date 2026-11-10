import { locationGateway } from "@/infrastructure/device/location.gateway";

export type LocationFailure = "permission_denied" | "location_unavailable";

export type CurrentLocationResult =
  | {
      ok: true;
      latitude: number;
      longitude: number;
    }
  | {
      ok: false;
      reason: LocationFailure;
    };

export interface CountryLocation {
  country: string | null;
  countryCode: string | null;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export const locationService = {
  async getCurrentLocation(): Promise<CurrentLocationResult> {
    try {
      const granted = await locationGateway.requestForegroundPermission();
      if (!granted) {
        return { ok: false, reason: "permission_denied" };
      }

      const coordinates = await locationGateway.getCurrentPosition();
      return { ok: true, ...coordinates };
    } catch {
      return { ok: false, reason: "location_unavailable" };
    }
  },

  async resolveCountry(coordinates: Coordinates): Promise<CountryLocation | null> {
    try {
      const place = await locationGateway.reverseGeocode(coordinates);
      if (!place) return null;

      return {
        country: place.country,
        countryCode: place.isoCountryCode,
      };
    } catch {
      return null;
    }
  },
};
