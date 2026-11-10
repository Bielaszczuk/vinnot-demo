/**
 * Regions Service.
 * @architecture: Capa 3 — Aplicación
 */
import { regionsClient, type CountryDto, type RegionDto } from "@/infrastructure/api/clients/regions.client";

export interface Country {
  id: string;
  code: string;
  name: string;
}

export interface Region {
  id: string;
  name: string;
  countryId: string;
  countryCode: string;
  countryName: string;
}

function mapCountry(dto: CountryDto): Country {
  return { id: dto.id, code: dto.code, name: dto.name };
}

function mapRegion(dto: RegionDto): Region {
  return {
    id: dto.id,
    name: dto.name,
    countryId: dto.countryId,
    countryCode: dto.countryCode,
    countryName: dto.countryName,
  };
}

export const regionsService = {
  async getCountries(): Promise<Country[]> {
    const dtos = await regionsClient.getCountries();
    return dtos.map(mapCountry);
  },

  async getRegions(): Promise<Region[]> {
    const dtos = await regionsClient.getRegions();
    return dtos.map(mapRegion);
  },

  async getRegionsByCountry(countryId: string): Promise<Region[]> {
    const dtos = await regionsClient.getRegionsByCountry(countryId);
    return dtos.map(mapRegion);
  },
};
