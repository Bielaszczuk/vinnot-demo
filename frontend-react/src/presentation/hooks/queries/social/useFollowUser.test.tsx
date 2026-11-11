import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { socialService } from '@services/social.service'
import { queryKeys } from '@hooks/queries/queryKeys'
import type { UserProfile } from '@domain/user/user.types'
import type { SocialPage, SocialUser, SuggestedUser } from '@domain/social/social.types'
import { useFollowUser } from './useFollowUser'

const addToast = vi.fn()
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@services/social.service', () => ({ socialService: { follow: vi.fn(), unfollow: vi.fn() } }))

const profile = { id: 'u1', following: false, followersCount: 3 } as UserProfile
const row: SocialUser = { id: 'u1', username: 'ana', displayName: 'Ana', avatarUrl: null, tier: null, following: false }
const suggestion: SuggestedUser = { ...row, affinityPercent: 70, reviewsCount: 5 }

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })
  client.setQueryData(queryKeys.social.profile('u1'), profile)
  client.setQueryData<SocialPage<SocialUser>>(queryKeys.social.followers('me', 0), { items: [row], page: 0, totalItems: 1, totalPages: 1 })
  client.setQueryData<SuggestedUser[]>(queryKeys.social.suggestions(6), [suggestion])
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, ...renderHook(() => useFollowUser(), { wrapper }) }
}

describe('useFollowUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('flips the follow state and the follower count at once, then calls PUT follow', async () => {
    let resolve!: () => void
    vi.mocked(socialService.follow).mockReturnValue(new Promise<void>((done) => { resolve = done }))
    const { client, result } = setup()

    act(() => result.current.toggle({ id: 'u1', following: false }))

    await waitFor(() => expect(client.getQueryData<UserProfile>(queryKeys.social.profile('u1'))).toMatchObject({ following: true, followersCount: 4 }))
    expect(client.getQueryData<SocialPage<SocialUser>>(queryKeys.social.followers('me', 0))?.items[0]!.following).toBe(true)
    expect(client.getQueryData<SuggestedUser[]>(queryKeys.social.suggestions(6))?.[0]!.following).toBe(true)
    expect(result.current.isPending('u1')).toBe(true)
    expect(socialService.follow).toHaveBeenCalledWith('u1')

    const invalidate = vi.spyOn(client, 'invalidateQueries')
    await act(async () => resolve())
    await waitFor(() => expect(invalidate).toHaveBeenCalled())
    expect(result.current.isPending('u1')).toBe(false)
  })

  it('unfollows with DELETE and lowers the count', async () => {
    vi.mocked(socialService.unfollow).mockResolvedValue()
    const { client, result } = setup()
    client.setQueryData(queryKeys.social.profile('u1'), { ...profile, following: true, followersCount: 1 })

    act(() => result.current.toggle({ id: 'u1', following: true }))

    await waitFor(() => expect(socialService.unfollow).toHaveBeenCalledWith('u1'))
    expect(socialService.follow).not.toHaveBeenCalled()
    expect(client.getQueryData<UserProfile>(queryKeys.social.profile('u1'))).toMatchObject({ following: false, followersCount: 0 })
  })

  it('restores the previous state and warns when the request fails', async () => {
    vi.mocked(socialService.follow).mockRejectedValue(new Error('offline'))
    const { client, result } = setup()

    act(() => result.current.toggle({ id: 'u1', following: false }))

    await waitFor(() => expect(addToast).toHaveBeenCalledWith({ type: 'error', message: 'social.followError' }))
    expect(client.getQueryData<UserProfile>(queryKeys.social.profile('u1'))).toMatchObject({ following: false, followersCount: 3 })
    expect(client.getQueryData<SuggestedUser[]>(queryKeys.social.suggestions(6))?.[0]!.following).toBe(false)
  })

  it('keeps people to follow visible after following, so the button can show the new state', async () => {
    vi.mocked(socialService.follow).mockResolvedValue()
    const { client, result } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    act(() => result.current.toggle({ id: 'u1', following: false }))

    await waitFor(() => expect(invalidate).toHaveBeenCalled())
    const { predicate } = invalidate.mock.calls[0]![0] as { predicate: (query: { queryKey: readonly unknown[] }) => boolean }
    expect(predicate({ queryKey: queryKeys.social.profile('u1') })).toBe(true)
    expect(predicate({ queryKey: queryKeys.social.feed(0, 3) })).toBe(true)
    expect(predicate({ queryKey: queryKeys.social.suggestions(6) })).toBe(false)
    expect(predicate({ queryKey: ['wines'] })).toBe(false)
  })
})
