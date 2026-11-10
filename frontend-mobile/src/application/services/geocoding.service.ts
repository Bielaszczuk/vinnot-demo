/**
 * Geocoding service.
 *
 * Normalizes Google Geocoding responses to the same domain shape used by the
 * web frontend, with mobile-only fields included for admin form persistence.
 */

import { geocodingClient } from "@/infrastructure/api/clients/geocoding.client";
import { env } from "@/shared/config/env";
import type { GeocodeAddressComponentDto, GeocodeResponseDto } from "@/infrastructure/api/clients/geocoding.client";

export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  placeId: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
}

export interface GeocodeResult {
  ok: boolean;
  status: string;
  errorMessage: string | null;
  location: GeocodedLocation | null;
}

function findComponent(
  components: GeocodeAddressComponentDto[] | undefined,
  type: string,
): string | null {
  return components?.find((component) => component.types.includes(type))?.long_name ?? null;
}

function normalizeText(value: string | null): string {
  return value
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim() ?? "";
}

export function extractLocationParts(components: GeocodeAddressComponentDto[] | undefined) {
  let city =
    findComponent(components, "locality") ??
    findComponent(components, "postal_town") ??
    findComponent(components, "administrative_area_level_2") ??
    findComponent(components, "sublocality_level_1");
  let region = findComponent(components, "administrative_area_level_1");
  const country = findComponent(components, "country");

  if (normalizeText(region) === "ciudad autonoma de buenos aires") {
    city = "Ciudad Autónoma de Buenos Aires";
    region = "Buenos Aires";
  }

  return { city, region, country };
}

function mapGeocodeResponse(response: GeocodeResponseDto): GeocodeResult {
  const first = response.results?.[0];

  if (response.status !== "OK" || !first?.geometry?.location) {
    return {
      ok: false,
      status: response.status || "UNKNOWN_ERROR",
      errorMessage: response.error_message ?? null,
      location: null,
    };
  }

  const { city, region, country } = extractLocationParts(first.address_components);

  return {
    ok: true,
    status: response.status,
    errorMessage: null,
    location: {
      latitude: first.geometry.location.lat,
      longitude: first.geometry.location.lng,
      formattedAddress: first.formatted_address,
      placeId: first.place_id ?? null,
      city,
      region,
      country,
    },
  };
}

export const geocodingService = {
  async geocodeAddress(address: string): Promise<GeocodeResult> {
    const normalizedAddress = address.trim();

    if (!normalizedAddress) {
      return {
        ok: false,
        status: "EMPTY_ADDRESS",
        errorMessage: "Ingresá una dirección para buscar",
        location: null,
      };
    }

    if (!env.googleMapsApiKey) {
      return {
        ok: false,
        status: "NO_API_KEY",
        errorMessage: "API Key de Google Maps no configurada",
        location: null,
      };
    }

    try {
      const response = await geocodingClient.geocodeAddress(normalizedAddress, env.googleMapsApiKey);
      return mapGeocodeResponse(response);
    } catch (error) {
      return {
        ok: false,
        status: "UNKNOWN_ERROR",
        errorMessage: error instanceof Error ? error.message : null,
        location: null,
      };
    }
  },
};

export default geocodingService;
