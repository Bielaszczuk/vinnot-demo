/**
 * Wine Route domain types
 */

export interface WineRoute {
  id: string
  name: string
  description: string
  region: string
  country: string
  /** Null when the route does not say how long it is. */
  difficulty: RouteDifficulty | null
  /** Estimated minutes; 0 when unknown. */
  duration: number
  /** Estimated days, when the route is measured in days. */
  days: number | null
  distance: number
  stops: RouteStop[]
  /** Server count for list responses, whose stop details are not loaded. */
  stopCount?: number
  imageUrl: string | null
  mapEmbedUrl: string | null
  rating: number | null
  reviewCount: number
  tags: string[]
  isPublished: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type RouteDifficulty = 'short' | 'medium' | 'long'

export interface RouteStop {
  id: string
  order: number
  name: string
  type: StopType
  description: string
  location: RouteLocation
  duration: number
  winery: RouteWinery | null
}

export type StopType = 'winery' | 'restaurant' | 'viewpoint' | 'attraction' | 'accommodation'

export interface RouteLocation {
  address: string
  city: string
  latitude: number | null
  longitude: number | null
}

export interface RouteWinery {
  id: string
  name: string
  wines: string[]
  email?: string | null
  phone?: string | null
  website?: string | null
  address?: string | null
}

export interface WineRouteFilter {
  search?: string
  country?: string
  region?: string
  subregion?: string
  difficulty?: RouteDifficulty | RouteDifficulty[]
  minDuration?: number
  maxDuration?: number
  minDistance?: number
  maxDistance?: number
  minRating?: number
  sortBy?: 'name' | 'rating' | 'duration' | 'distance'
  sortOrder?: 'asc' | 'desc'
}

export interface WineRouteHierarchy {
  countries: WineRouteHierarchyCountry[]
}

export interface WineRouteHierarchyCountry {
  name: string
  regions: WineRouteHierarchyRegion[]
}

export interface WineRouteHierarchyRegion {
  name: string
  subregions: string[]
}

export interface WineRouteReview {
  id: string
  routeId: string
  userId: string
  userName: string
  rating: number
  comment: string
  visitedAt: Date
  createdAt: Date
}
