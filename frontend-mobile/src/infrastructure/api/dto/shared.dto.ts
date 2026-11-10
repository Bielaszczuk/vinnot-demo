/**
 * Wineries, cellar, users, wineRoutes DTOs.
 * @contract: keep in sync with frontend-react/src/api/dto/
 */

// ─── Wineries ─────────────────────────────────────────────────────────────────
export interface WinerySummaryDto {
  id: number;
  name: string;
  country: string;
  region?: string | null;
  imageUrl?: string | null;
  logoUrl?: string | null;
  averageRating?: number | null;
  wineCount: number;
}

export interface WineryDetailDto extends WinerySummaryDto {
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  website?: string | null;
  phone?: string | null;
  openingHours?: string | null;
  foundedYear?: number | null;
}

// ─── Cellar ───────────────────────────────────────────────────────────────────
export interface CellarEntryDto {
  id: number;
  wineId: number;
  wineName: string;
  winery: string;
  imageUrl?: string | null;
  vintage?: number | null;
  quantity: number;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  notes?: string | null;
  status: "DRINKING" | "AGING" | "CONSUMED";
  addedAt: string;
}

export interface AddToCellarDto {
  wineId: number;
  vintage?: number;
  quantity: number;
  purchasePrice?: number;
  purchaseDate?: string;
  notes?: string;
  status?: "DRINKING" | "AGING" | "CONSUMED";
}

// ─── Users ────────────────────────────────────────────────────────────────────
export interface UserProfileDto {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
  bio?: string | null;
  roles: string[];
  createdAt: string;
}

export interface UserStatsDto {
  cellarCount: number;
  reviewCount: number;
  followingCount: number;
  followersCount: number;
}

// ─── Wine Routes ──────────────────────────────────────────────────────────────
export interface WineRouteSummaryDto {
  id: number;
  name: string;
  country: string;
  region?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  stopCount: number;
  durationHours?: number | null;
  difficultyLevel?: string | null;
}

export interface WineRouteDetailDto extends WineRouteSummaryDto {
  stops: WineRouteStopDto[];
  highlights?: string[] | null;
}

export interface WineRouteStopDto {
  id: number;
  wineryId: number;
  wineryName: string;
  wineryImageUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  order: number;
  description?: string | null;
}

