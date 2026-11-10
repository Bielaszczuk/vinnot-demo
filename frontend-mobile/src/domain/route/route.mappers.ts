/**
 * Wine Route domain mappers.
 * @contract: keep in sync with frontend-react/src/domain/route/route.mappers.ts
 */
import type { WineRoute, RouteDifficulty, RouteStop, RouteWinery } from "./route.types";

const ROUTE_DIFFICULTIES: readonly RouteDifficulty[] = ["short", "medium", "long"];

function mapRouteDifficulty(value: string | null | undefined): RouteDifficulty | null {
  const normalized = value?.toLowerCase() as RouteDifficulty | undefined;
  return normalized && ROUTE_DIFFICULTIES.includes(normalized) ? normalized : null;
}

type RouteWineryInput = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  address?: string | null;
};

type RouteStopInput = {
  id: string;
  stopOrder?: number | null;
  name: string;
  type?: string | null;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  estimatedDuration?: number | null;
};

type WineRouteSummaryInput = {
  stopCount?: number | null;
  id: string;
  name: string;
  description?: string | null;
  region?: string | null;
  country?: string | null;
  difficulty?: string | null;
  estimatedDuration?: number | null;
  estimatedDays?: number | null;
  totalDistance?: number | null;
  imageUrl?: string | null;
  mapEmbedUrl?: string | null;
  status?: string | null;
  createdAt?: string | null;
};

type WineRouteDetailsInput = WineRouteSummaryInput & {
  wineries?: RouteWineryInput[] | null;
  stops?: RouteStopInput[] | null;
  recommendedWineTypes?: string[] | null;
  createdById?: string | null;
  updatedAt?: string | null;
};

export function mapWineRouteSummaryFromDto(dto: WineRouteSummaryInput): WineRoute {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? "",
    region: dto.region ?? "",
    country: dto.country ?? "",
    difficulty: mapRouteDifficulty(dto.difficulty),
    duration: dto.estimatedDuration ?? 0,
    estimatedDays: dto.estimatedDays ?? null,
    distance: dto.totalDistance ?? 0,
    stops: [],
    stopCount: dto.stopCount ?? 0,
    imageUrl: dto.imageUrl ?? null,
    mapEmbedUrl: dto.mapEmbedUrl ?? null,
    rating: null,
    reviewCount: 0,
    tags: [],
    isPublished: dto.status === "active",
    createdBy: "",
    createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
    updatedAt: new Date(),
  };
}

export function mapWineRouteFromDto(dto: WineRouteDetailsInput): WineRoute {
  const wineryMap = new Map<string, RouteWinery>();
  if (dto.wineries) {
    for (const w of dto.wineries) {
      wineryMap.set(w.name.toLowerCase(), mapRouteWineryFromDto(w));
    }
  }

  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? "",
    region: dto.region ?? "",
    country: dto.country ?? "",
    difficulty: mapRouteDifficulty(dto.difficulty),
    duration: dto.estimatedDuration ?? 0,
    estimatedDays: dto.estimatedDays ?? null,
    distance: dto.totalDistance ?? 0,
    stopCount: dto.stops?.length ?? dto.stopCount ?? 0,
    stops:
      dto.stops?.map((s) => {
        const stop = mapRouteStopFromDto(s);
        if (stop.type === "winery" && !stop.winery) {
          const matched = wineryMap.get(stop.name.toLowerCase());
          if (matched) stop.winery = matched;
        }
        return stop;
      }) ?? [],
    imageUrl: dto.imageUrl ?? null,
    mapEmbedUrl: dto.mapEmbedUrl ?? null,
    rating: null,
    reviewCount: 0,
    tags: dto.recommendedWineTypes ?? [],
    isPublished: dto.status === "active",
    createdBy: dto.createdById ?? "",
    createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
    updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : new Date(),
  };
}

export function mapRouteStopFromDto(dto: RouteStopInput): RouteStop {
  return {
    id: dto.id,
    order: dto.stopOrder ?? 0,
    name: dto.name,
    type: (dto.type as RouteStop["type"]) ?? "winery",
    description: dto.description ?? "",
    location: {
      address: dto.address ?? "",
      city: "",
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
    },
    duration: dto.estimatedDuration ?? 0,
    winery: null,
  };
}

export function mapRouteWineryFromDto(dto: RouteWineryInput): RouteWinery {
  return {
    id: dto.id,
    name: dto.name,
    wines: [],
    email: dto.email ?? null,
    phone: dto.phone ?? null,
    website: dto.websiteUrl ?? null,
    address: dto.address ?? null,
  };
}
