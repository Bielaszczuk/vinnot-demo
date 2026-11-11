/**
 * Centralized TanStack Query key factory
 *
 * All query keys live here for consistency, type-safety, and easy invalidation.
 * Follows the "query key factory" pattern recommended by TanStack.
 *
 * Usage:
 *   queryKeys.wines.all        → ['wines']
 *   queryKeys.wines.list(...)  → ['wines', 'list', filters]
 *   queryKeys.wines.detail(id) → ['wines', 'detail', id]
 */

export const queryKeys = {
  wines: {
    all: ['wines'] as const,
    lists: () => [...queryKeys.wines.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.wines.lists(), filters] as const,
    details: () => [...queryKeys.wines.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.wines.details(), id] as const,
    reviews: (wineId: string, page?: number, filter?: string) =>
      [...queryKeys.wines.detail(wineId), 'reviews', { page, filter }] as const,
    myReview: (wineId: string) =>
      [...queryKeys.wines.detail(wineId), 'reviews', 'mine'] as const,
    reviewComments: (wineId: string, reviewId: string) =>
      [...queryKeys.wines.detail(wineId), 'reviews', reviewId, 'comments'] as const,
    similar: (wineId: string) =>
      [...queryKeys.wines.detail(wineId), 'similar'] as const,
    aiProfiles: (wineId: string) =>
      [...queryKeys.wines.detail(wineId), 'ai-profile'] as const,
    aiProfile: (wineId: string, language: string) =>
      [...queryKeys.wines.aiProfiles(wineId), language] as const,
    aiProfileStatus: (wineId: string, language: string) =>
      [...queryKeys.wines.detail(wineId), 'ai-profile-status', language] as const,
    search: (params: Record<string, unknown>) =>
      [...queryKeys.wines.all, 'search', params] as const,
    comparison: (wineAId: string, wineBId: string, language: string) =>
      [...queryKeys.compare.all, wineAId, wineBId, language] as const,
    grapeTypes: () => [...queryKeys.wines.all, 'grape-types'] as const,
    wineTypes: () => [...queryKeys.wines.all, 'wine-types'] as const,
  },

  regions: {
    all: ['regions'] as const,
    list: () => [...queryKeys.regions.all, 'list'] as const,
    countries: () => [...queryKeys.regions.all, 'countries'] as const,
    byCountry: (countryId: string) =>
      [...queryKeys.regions.all, 'country', countryId] as const,
  },

  events: {
    all: ['events'] as const,
    lists: () => [...queryKeys.events.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.events.lists(), filters] as const,
    details: () => [...queryKeys.events.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.events.details(), id] as const,
    nearby: (params: Record<string, unknown>) =>
      [...queryKeys.events.all, 'nearby', params] as const,
    discovery: (params: Record<string, unknown>) =>
      [...queryKeys.events.all, 'discovery', params] as const,
    myRegistration: (eventId: string) =>
      [...queryKeys.events.detail(eventId), 'registration', 'mine'] as const,
    registrations: (eventId: string, params: Record<string, unknown>) =>
      [...queryKeys.events.detail(eventId), 'registrations', params] as const,
  },

  wineries: {
    all: ['wineries'] as const,
    lists: () => [...queryKeys.wineries.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.wineries.lists(), filters] as const,
    details: () => [...queryKeys.wineries.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.wineries.details(), id] as const,
    wines: (wineryId: string, params?: Record<string, unknown>) =>
      [...queryKeys.wineries.detail(wineryId), 'wines', params] as const,
  },

  wineRoutes: {
    all: ['wine-routes'] as const,
    lists: () => [...queryKeys.wineRoutes.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.wineRoutes.lists(), filters] as const,
    details: () => [...queryKeys.wineRoutes.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.wineRoutes.details(), id] as const,
    hierarchy: () => [...queryKeys.wineRoutes.all, 'hierarchy'] as const,
    countries: () => [...queryKeys.wineRoutes.all, 'countries'] as const,
    regions: (country: string) =>
      [...queryKeys.wineRoutes.all, 'regions', country] as const,
  },

  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    me: () => [...queryKeys.users.all, 'me'] as const,
    myStats: () => [...queryKeys.users.all, 'me', 'stats'] as const,
    myPoints: () => [...queryKeys.users.all, 'me', 'points'] as const,
    notificationPreferences: () => [...queryKeys.users.all, 'me', 'notification-preferences'] as const,
    eventArea: () => [...queryKeys.users.all, 'me', 'event-area'] as const,
    tasteQuiz: () => [...queryKeys.users.all, 'me', 'taste-quiz'] as const,
  },

  social: {
    all: ['social'] as const,
    profiles: () => [...queryKeys.social.all, 'profile'] as const,
    profile: (userId: string) => [...queryKeys.social.profiles(), userId] as const,
    reviews: (userId: string, page: number) => [...queryKeys.social.profile(userId), 'reviews', page] as const,
    cellar: (userId: string, page: number) => [...queryKeys.social.profile(userId), 'cellar', page] as const,
    followers: (userId: string, page: number) => [...queryKeys.social.all, 'followers', userId, page] as const,
    following: (userId: string, page: number) => [...queryKeys.social.all, 'following', userId, page] as const,
    suggestions: (size: number) => [...queryKeys.social.all, 'suggestions', size] as const,
    feed: (page: number, size: number) => [...queryKeys.social.all, 'feed', page, size] as const,
  },

  cellar: {
    all: ['cellar'] as const,
    lists: () => [...queryKeys.cellar.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.cellar.lists(), filters] as const,
  },

  compare: {
    all: ['compare'] as const,
    pair: (ids: string[]) => [...queryKeys.compare.all, ...ids] as const,
  },

  partner: {
    all: ['partner'] as const,
    events: {
      all: () => [...queryKeys.partner.all, 'events'] as const,
      list: (params: Record<string, unknown>) =>
        [...queryKeys.partner.events.all(), 'list', params] as const,
      detail: (id: string) =>
        [...queryKeys.partner.events.all(), 'detail', id] as const,
    },
  },

  admin: {
    all: ['admin'] as const,
    stats: () => [...queryKeys.admin.all, 'stats'] as const,
    wines: {
      all: () => [...queryKeys.admin.all, 'wines'] as const,
      list: (params: Record<string, unknown>) =>
        [...queryKeys.admin.wines.all(), 'list', params] as const,
      detail: (id: string) =>
        [...queryKeys.admin.wines.all(), 'detail', id] as const,
    },
    wineries: {
      all: () => [...queryKeys.admin.all, 'wineries'] as const,
      list: (params: Record<string, unknown>) =>
        [...queryKeys.admin.wineries.all(), 'list', params] as const,
    },
    events: {
      all: () => [...queryKeys.admin.all, 'events'] as const,
      list: (params: Record<string, unknown>) =>
        [...queryKeys.admin.events.all(), 'list', params] as const,
    },
    routes: {
      all: () => [...queryKeys.admin.all, 'routes'] as const,
      list: (params: Record<string, unknown>) =>
        [...queryKeys.admin.routes.all(), 'list', params] as const,
      detail: (id: string) =>
        [...queryKeys.admin.routes.all(), 'detail', id] as const,
    },
    users: {
      all: () => [...queryKeys.admin.all, 'users'] as const,
      list: (params: Record<string, unknown>) =>
        [...queryKeys.admin.users.all(), 'list', params] as const,
    },
    reviews: {
      all: () => [...queryKeys.admin.all, 'reviews'] as const,
      list: (params: Record<string, unknown>) =>
        [...queryKeys.admin.reviews.all(), 'list', params] as const,
    },
    wineSubmissions: {
      all: () => [...queryKeys.admin.all, 'wine-submissions'] as const,
      list: (params: Record<string, unknown>) =>
        [...queryKeys.admin.wineSubmissions.all(), 'list', params] as const,
      detail: (id: string) =>
        [...queryKeys.admin.wineSubmissions.all(), 'detail', id] as const,
    },
    notifications: {
      all: () => [...queryKeys.admin.all, 'notifications'] as const,
      push: () => [...queryKeys.admin.notifications.all(), 'push'] as const,
      metrics: (days: number) => [...queryKeys.admin.notifications.all(), 'metrics', days] as const,
      engagement: (days: number) => [...queryKeys.admin.notifications.all(), 'engagement', days] as const,
      preview: (params: Record<string, unknown>) =>
        [...queryKeys.admin.notifications.all(), 'preview', params] as const,
      reach: (params: Record<string, unknown>) =>
        [...queryKeys.admin.notifications.all(), 'reach', params] as const,
      history: () => [...queryKeys.admin.notifications.all(), 'history'] as const,
    },
    appVersions: () => [...queryKeys.admin.all, 'app-versions'] as const,
    countries: () => [...queryKeys.admin.all, 'countries'] as const,
    regions: (countryId: string) =>
      [...queryKeys.admin.all, 'regions', countryId] as const,
  },
} as const
