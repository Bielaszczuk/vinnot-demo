import { getMockConfig } from './config'
import winesData from './fixtures/wines.json'
import reviewsData from './fixtures/reviews.json'
import eventsData from './fixtures/events.json'
import routesData from './fixtures/routes.json'
import usersData from './fixtures/users.json'
import comparisonsData from './fixtures/comparisons.json'
import aiProfilesData from './fixtures/aiProfiles.json'

export const API_BASE = '/api'

export type WineFixture = (typeof winesData.wines)[number]
export type ReviewFixture = (typeof reviewsData.reviews)[keyof typeof reviewsData.reviews][number]
export type EventFixture = (typeof eventsData.events)[number]
export type RouteFixture = (typeof routesData.routes)[number]
export type UserFixture = (typeof usersData.users)[number]
export type ComparisonFixture = (typeof comparisonsData.comparisons)[keyof typeof comparisonsData.comparisons]
export type AiProfileFixture = (typeof aiProfilesData.profiles)[keyof typeof aiProfilesData.profiles]

export const wines: WineFixture[] = winesData.wines
export const reviews: Record<string, ReviewFixture[]> = reviewsData.reviews
export const events: EventFixture[] = eventsData.events
export const routes: RouteFixture[] = routesData.routes
export const users: UserFixture[] = usersData.users
export const credentials = usersData.credentials as Record<string, string>
export const comparisons: Record<string, ComparisonFixture> = comparisonsData.comparisons
export const aiProfiles: Record<string, AiProfileFixture> = aiProfilesData.profiles

const tokenStore: Record<string, { userId: string; expiresAt: number }> = {}

export function generateToken(userId: string): string {
  const token = `mock-token-${userId}-${Date.now()}`
  const config = getMockConfig()
  tokenStore[token] = {
    userId,
    expiresAt: Date.now() + config.auth.tokenExpiryMs,
  }
  return token
}

export function validateToken(token: string): string | null {
  const stored = tokenStore[token]
  if (!stored) return null
  if (Date.now() > stored.expiresAt) {
    delete tokenStore[token]
    return null
  }
  return stored.userId
}

export function removeToken(token: string): void {
  delete tokenStore[token]
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const paginatedItems = items.slice(start, end)

  return {
    data: paginatedItems,
    pagination: {
      page,
      page_size: pageSize,
      total_items: items.length,
      total_pages: Math.ceil(items.length / pageSize),
      has_next: end < items.length,
      has_previous: page > 1,
    },
  }
}
