/**
 * Winery DTOs — match backend response shapes exactly.
 * @contract: keep in sync with frontend-react/src/api/dto/wineries.dto.ts
 */

export interface WinerySummaryDto {
  id: string;
  name: string;
  slug: string | null;
  countryName: string | null;
  regionName: string | null;
  logoUrl: string | null;
  imageUrl: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface WineryDetailsDto {
  id: string;
  name: string;
  slug: string | null;
  descriptionEs: string | null;
  descriptionEn: string | null;
  subregion: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  imageUrl: string | null;
  establishedYear: number | null;
  seoName: string | null;
  businessName: string | null;
  regionId: string | null;
  regionName: string | null;
  countryId: string | null;
  countryCode: string | null;
  countryName: string | null;
  ratingsCount: number | null;
  ratingsAverage: number | null;
  winesCount: number | null;
  labelsCount: number | null;
  backgroundImageUrl: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WineryFilterParamsDto {
  search?: string;
  country?: string;
  region?: string;
  page?: number;
  size?: number;
}

export interface UpdateWineryCoordinatesRequestDto {
  latitude: number;
  longitude: number;
  address?: string | null;
}

/** Backend `PageResponseWrapper` for `GET /wineries`. */
export interface WineriesPageResponseDto {
  items?: WinerySummaryDto[];
  content?: WinerySummaryDto[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  first?: boolean;
  last?: boolean;
  hasNext?: boolean;
  hasPrevious?: boolean;
  empty?: boolean;
}

