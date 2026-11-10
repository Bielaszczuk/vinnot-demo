/**
 * Regions & Countries API Client.
 * @architecture: Capa 4 — Infraestructura HTTP
 */
import { http } from "@/infrastructure/api/http";

export interface CountryDto {
  id: string;
  code: string;
  name: string;
}

export interface RegionDto {
  id: string;
  name: string;
  countryId: string;
  countryCode: string;
  countryName: string;
}

export const regionsClient = {
  getCountries: (): Promise<CountryDto[]> =>
    http.get<CountryDto[]>("/regions/countries").then((r) => r.data),

  getRegions: (): Promise<RegionDto[]> =>
    http.get<RegionDto[]>("/regions").then((r) => r.data),

  getRegionsByCountry: (countryId: string): Promise<RegionDto[]> =>
    http.get<RegionDto[]>(`/regions/country/${countryId}`).then((r) => r.data),
};
