import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { UserProfile } from '@domain/user/user.types'
import type { SocialReview, SocialUser, TasteTraits } from '@domain/social/social.types'

/** Mounts a page under real TanStack Query and router contexts. */
export function renderWithProviders(routes: ReactNode, path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          {routes}
          <Route path="*" element={<p>route:other</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { client, ...view }
}

export const profileFixture = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'u2', username: 'ana', displayName: 'Ana Pérez', avatar: null, joinedAt: new Date('2026-01-01T00:00:00Z'),
  bio: 'Malbec y montaña', tier: 'RESERVA', followersCount: 12, followingCount: 3, reviewsCount: 8,
  cellarCount: 20, cellarVisible: true, following: false, followsYou: true, affinityPercent: 76,
  tasteWheel: [
    { kind: 'TYPE', value: 'RED', label: 'Tinto', score: 4.5, tone: 'RED', ratedWines: 8 },
    { kind: 'GRAPE', value: 'malbec', label: 'Malbec', score: 4, tone: 'RED', ratedWines: 6 },
  ],
  tasteTraits: null,
  ...overrides,
})

export const tasteTraitsFixture = (overrides: Partial<TasteTraits> = {}): TasteTraits => ({
  structure: [
    { trait: 'ACIDITY', score: 20, wines: 9, adjusted: false },
    { trait: 'BODY', score: 50, wines: 9, adjusted: false },
    { trait: 'TANNIN', score: 80, wines: 7, adjusted: false },
    { trait: 'SWEETNESS', score: 10, wines: 9, adjusted: false },
  ],
  families: [
    { family: 'FRUIT', percent: 70 },
    { family: 'OAK', percent: 30 },
  ],
  fromQuiz: false,
  ...overrides,
})

export const reviewFixture = (overrides: Partial<SocialReview> = {}): SocialReview => ({
  id: 'r1', rating: 4, title: 'Fresco y frutado', comment: 'Mucha fruta roja', vintage: 2020, createdAt: new Date('2026-11-01T00:00:00Z'),
  reviewer: { id: 'u2', username: 'ana', displayName: 'Ana Pérez', avatarUrl: null, tier: 'RESERVA' },
  wine: { id: 'w1', name: 'Malbec Reserva', imageUrl: null, type: 'RED', wineryName: 'Bodega Sur' },
  ...overrides,
})

export const userFixture = (overrides: Partial<SocialUser> = {}): SocialUser => ({
  id: 'u3', username: 'leo', displayName: 'Leo', avatarUrl: null, tier: null, following: false, ...overrides,
})

/** Translation stub: the key, plus its values when there are any. */
export const translate = (key: string, values?: Record<string, unknown>) =>
  values && Object.keys(values).length ? `${key}:${Object.values(values).join('|')}` : key
