/**
 * Wine Route DTOs — match backend response shapes exactly.
 * @contract: keep in sync with frontend-react/src/infrastructure/api/dto/wineRoutes.dto.ts
 */

export type RouteDifficultyDto = "short" | "medium" | "long";

export interface WineRouteSummaryDto {
  id: string;
  name: string;
  description?: string | null;
  country?: string | null;
  region?: string | null;
  subregion?: string | null;
  estimatedDuration?: number | null;
  estimatedDays?: number | null;
  totalDistance?: number | null;
  difficulty?: string | null;
  imageUrl?: string | null;
  mapEmbedUrl?: string | null;
  status?: string | null;
  wineryCount?: number;
  stopCount?: number;
  createdAt?: string | null;
}

export interface WineRouteDetailsDto extends WineRouteSummaryDto {
  recommendedWineTypes?: string[] | null;
  stops?: RouteStopDto[];
  wineries?: RouteWineryDto[];
  createdById?: string | null;
  updatedAt?: string | null;
}

export type WineRouteDto = WineRouteDetailsDto;

export interface RouteStopDto {
  id: string;
  name: string;
  type?: string | null;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  estimatedDuration?: number | null;
  stopOrder?: number;
}

export interface RouteWineryDto {
  id: string;
  name: string;
  region?: string | null;
  country?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface WineRouteHierarchyDto {
  countries: WineRouteHierarchyCountryDto[];
}

export interface WineRouteHierarchyCountryDto {
  name: string;
  regions: WineRouteHierarchyRegionDto[];
}

export interface WineRouteHierarchyRegionDto {
  name: string;
  subregions: string[];
}

export interface CreateWineRouteRequestDto {
  name: string;
  description: string;
  region: string;
  country: string;
  difficulty: RouteDifficultyDto;
  estimatedDuration: number;
  totalDistance: number;
  imageUrl?: string;
}

export interface UpdateWineRouteRequestDto extends Partial<CreateWineRouteRequestDto> {
  status?: string;
}

export interface WineRouteFilterParamsDto {
  country?: string;
  region?: string;
  subregion?: string;
  search?: string;
  page?: number;
  size?: number;
}

export interface WineRoutesPageResponseDto {
  items: WineRouteSummaryDto[];
  content: WineRouteSummaryDto[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  empty: boolean;
}
