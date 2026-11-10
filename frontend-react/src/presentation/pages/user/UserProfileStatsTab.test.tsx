import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import type { UserProfileViewModel } from './useUserProfileViewModel'
import { UserProfileStatsTab } from './UserProfileStatsTab'

it('fills the activity bars over time, except under reduced motion', () => {
  const vm = {
    t: (key: string) => key,
    loadingStats: false,
    stats: { totalReviews: 4, cellarSize: 2, totalEventsAttended: 1, averageRating: 4 },
  } as unknown as UserProfileViewModel
  render(<UserProfileStatsTab vm={vm} />)
  const bar = screen.getByText('profile.reviewsLabel').parentElement!.nextElementSibling!.firstElementChild!
  expect(bar).toHaveStyle({ width: '20%' })
  expect(bar).toHaveClass('transition-all', 'duration-500', 'motion-reduce:transition-none')
})
