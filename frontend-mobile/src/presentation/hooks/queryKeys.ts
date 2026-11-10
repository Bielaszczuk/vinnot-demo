/**
 * Centralized query key factory.
 * Typed, hierarchical, surgically invalidatable.
 * @contract: keep in sync with frontend-react/src/hooks/queryKeys.ts
 */
import type { WineFilter } from "@/domain/wine/wine.types";

export const queryKeys = {
  wines: {
    all: () => ["wines"] as const,
    list: (filter: WineFilter & { page?: number; size?: number }) => ["wines", "list", filter] as const,
    detail: (id: number | string) => ["wines", "detail", id] as const,
    reviews: (id: number | string, params?: { page?: number; size?: number }) =>
      ["wines", "reviews", id, params] as const,
    comments: (wineId: number | string, reviewId: number | string) =>
      ["wines", "review-comments", wineId, reviewId] as const,
    aiProfile: (id: number | string) => ["wines", "ai-profile", id] as const,
    aiProfileStatus: (id: number | string) => ["wines", "ai-profile-status", id] as const,
    compare: (wineAId: number | string, wineBId: number | string, language = "es-AR") =>
      ["wines", "compare", wineAId, wineBId, language] as const,
    search: (query: string) => ["wines", "search", query] as const,
    myReviewStatus: (id: number | string) => ["wines", "my-review-status", id] as const,
    grapeTypes: () => ["wines", "grape-types"] as const,
    regions: () => ["wines", "regions"] as const,
    regionsByCountry: (countryId: string) => ["wines", "regions", "country", countryId] as const,
    countries: () => ["wines", "countries"] as const,
  },

  events: {
    all: () => ["events"] as const,
    list: (params: Record<string, unknown>) => ["events", "list", params] as const,
    detail: (id: number | string) => ["events", "detail", id] as const,
    nearby: (params: { latitude: number; longitude: number; radiusKm?: number }) =>
      ["events", "nearby", params] as const,
    attendees: (id: string) => ["events", "attendees", id] as const,
  },

  wineries: {
    all: () => ["wineries"] as const,
    list: (params: Record<string, unknown>) => ["wineries", "list", params] as const,
    detail: (id: number | string) => ["wineries", "detail", id] as const,
    wines: (id: number | string, params?: Record<string, unknown>) =>
      ["wineries", "wines", id, params] as const,
  },

  cellar: {
    all: () => ["cellar"] as const,
    list: (params?: Record<string, unknown>) => ["cellar", "list", params] as const,
  },

  wineRoutes: {
    all: () => ["wine-routes"] as const,
    list: (params?: Record<string, unknown>) => ["wine-routes", "list", params] as const,
    detail: (id: number | string) => ["wine-routes", "detail", id] as const,
    hierarchy: () => ["wine-routes", "hierarchy"] as const,
    countries: () => ["wine-routes", "countries"] as const,
  },

  user: {
    profile: () => ["user", "profile"] as const,
    stats: () => ["user", "stats"] as const,
  },

  admin: {
    stats: () => ["admin", "stats"] as const,
    wines: {
      all: () => ["admin", "wines"] as const,
      list: (params?: Record<string, unknown>) => ["admin", "wines", "list", params] as const,
      detail: (id: string) => ["admin", "wines", "detail", id] as const,
    },
    wineries: {
      all: () => ["admin", "wineries"] as const,
      list: (params?: Record<string, unknown>) => ["admin", "wineries", "list", params] as const,
    },
    events: {
      all: () => ["admin", "events"] as const,
      list: (params?: Record<string, unknown>) => ["admin", "events", "list", params] as const,
    },
    routes: {
      all: () => ["admin", "routes"] as const,
      list: (params?: Record<string, unknown>) => ["admin", "routes", "list", params] as const,
      detail: (id: string) => ["admin", "routes", "detail", id] as const,
    },
    users: {
      all: () => ["admin", "users"] as const,
      list: (params?: Record<string, unknown>) => ["admin", "users", "list", params] as const,
    },
    reviews: {
      all: () => ["admin", "reviews"] as const,
      list: (params?: Record<string, unknown>) => ["admin", "reviews", "list", params] as const,
    },
    countries: () => ["admin", "countries"] as const,
    regions: (countryId: string) => ["admin", "regions", countryId] as const,
  },

  partner: {
    events: {
      all: () => ["partner", "events"] as const,
      list: (params?: Record<string, unknown>) => ["partner", "events", "list", params] as const,
      detail: (id: string) => ["partner", "events", "detail", id] as const,
    },
  },
} as const;
