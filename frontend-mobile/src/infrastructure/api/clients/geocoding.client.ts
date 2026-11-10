/**
 * Google Geocoding REST client for React Native.
 *
 * Keep this client outside the shared authenticated HTTP client: Google rejects
 * the Authorization header and mobile geocoding must be a provider call, not an
 * API call to the Vinnot backend.
 */

import { Platform } from "react-native";
import { env } from "@/shared/config/env";

const GOOGLE_GEOCODE_BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

/** Provider-specific identity stays at the transport edge, never in screens. */
export function googleMapsIdentityHeaders(): Record<string, string> {
  if (Platform.OS === "ios" && env.googleMapsBundleIdentifier) {
    return { "X-Ios-Bundle-Identifier": env.googleMapsBundleIdentifier };
  }
  if (Platform.OS === "android" && env.googleMapsAndroidPackage) {
    const certificate = env.googleMapsAndroidCertificate.replaceAll(":", "").toUpperCase();
    if (/^[0-9A-F]{40}$/.test(certificate)) {
      return { "X-Android-Package": env.googleMapsAndroidPackage, "X-Android-Cert": certificate };
    }
  }
  if (env.isProduction) {
    throw new Error("La identidad de Google Maps no está configurada para esta aplicación");
  }
  return {};
}

export interface GeocodeAddressComponentDto {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface GeocodeResultDto {
  formatted_address: string;
  place_id?: string;
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
  address_components?: GeocodeAddressComponentDto[];
}

export interface GeocodeResponseDto {
  status: string;
  error_message?: string;
  results: GeocodeResultDto[];
}

export const geocodingClient = {
  async geocodeAddress(address: string, apiKey: string): Promise<GeocodeResponseDto> {
    const query = encodeURIComponent(address.trim());
    const url = `${GOOGLE_GEOCODE_BASE_URL}?address=${query}&key=${apiKey}`;
    const headers = googleMapsIdentityHeaders();
    const response = await fetch(url, { headers });
    return response.json() as Promise<GeocodeResponseDto>;
  },
};

export default geocodingClient;
