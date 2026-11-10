import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContentPillarSettings } from '@domain/admin/socialPost'
import { ContentPillarsPanel } from './ContentPillarsPanel'

let uiLanguage = 'es-AR'
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
    i18n: { language: uiLanguage, resolvedLanguage: uiLanguage },
  }),
}))
afterEach(cleanup)

const terroir: ContentPillarSettings = {
  code: 'TERROIR', nameEs: 'Terruño', nameEn: 'Terroir', weight: 3, active: true, autoApprove: true,
  performance: { measuredPosts: 4, views: 5000, interactions: 300, factor: 1.25 },
}
const humor: ContentPillarSettings = {
  code: 'HUMOR', nameEs: 'Humor', nameEn: 'Humour', weight: 1, active: false, autoApprove: false,
  performance: { measuredPosts: 0, views: 0, interactions: 0, factor: 1 },
}
const base = {
  pillars: [terroir, humor], loading: false, failed: false, switching: null,
  formatNumber: (value: number) => `n:${value}`, onRetry: vi.fn(), onToggleActive: vi.fn(), onToggleAutoApprove: vi.fn(),
}

describe('content pillars panel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    uiLanguage = 'es-AR'
  })

  it('lists each pillar with its name, weight, performance and its two switches', () => {
    render(<ContentPillarsPanel {...base} />)
    const rows = within(screen.getByRole('list', { name: 'admin.socialPosts.pillars.heading' })).getAllByRole('listitem')
    const first = within(rows[0]!)
    expect(first.getByText('Terruño')).toBeInTheDocument()
    expect(first.getByText('admin.socialPosts.pillars.weight {"weight":3}')).toBeInTheDocument()
    expect(first.getByText('admin.socialPosts.pillars.performance {"measured":4,"views":"n:5000","interactions":"n:300"}')).toBeInTheDocument()
    expect(first.getByText('admin.socialPosts.pillars.factor {"factor":"×1.25"}')).toBeInTheDocument()
    expect(first.getByRole('switch', { name: 'admin.socialPosts.pillars.activeLabel {"pillar":"Terruño"}' })).toHaveAttribute('aria-checked', 'true')
    expect(first.getByRole('switch', { name: 'admin.socialPosts.pillars.autoApproveLabel {"pillar":"Terruño"}' })).toHaveAttribute('aria-checked', 'true')
  })

  it('names the pillar in the UI language', () => {
    uiLanguage = 'en-US'
    render(<ContentPillarsPanel {...base} />)
    expect(screen.getByText('Terroir')).toBeInTheDocument()
    expect(screen.getByText('Humour')).toBeInTheDocument()
  })

  it('switches a pillar on or off and its auto-approval', () => {
    render(<ContentPillarsPanel {...base} />)
    fireEvent.click(screen.getByRole('switch', { name: 'admin.socialPosts.pillars.activeLabel {"pillar":"Terruño"}' }))
    expect(base.onToggleActive).toHaveBeenCalledWith(terroir)
    fireEvent.click(screen.getByRole('switch', { name: 'admin.socialPosts.pillars.autoApproveLabel {"pillar":"Terruño"}' }))
    expect(base.onToggleAutoApprove).toHaveBeenCalledWith(terroir)
  })

  it('disables auto-approval of an inactive pillar and explains why', () => {
    render(<ContentPillarsPanel {...base} />)
    const row = within(within(screen.getByRole('list', { name: 'admin.socialPosts.pillars.heading' })).getAllByRole('listitem')[1]!)
    expect(row.getByRole('switch', { name: 'admin.socialPosts.pillars.activeLabel {"pillar":"Humor"}' })).toHaveAttribute('aria-checked', 'false')
    expect(row.getByRole('switch', { name: 'admin.socialPosts.pillars.autoApproveLabel {"pillar":"Humor"}' })).toBeDisabled()
    expect(row.getByText('admin.socialPosts.pillars.autoApproveInactive')).toBeInTheDocument()
  })

  it('locks every switch while one pillar is saving', () => {
    render(<ContentPillarsPanel {...base} switching="TERROIR" />)
    for (const toggle of screen.getAllByRole('switch')) expect(toggle).toBeDisabled()
  })

  it('shows loading, failure with retry and an empty list', () => {
    const { rerender, container } = render(<ContentPillarsPanel {...base} loading pillars={[]} />)
    expect(container.querySelector('[role="status"]')).not.toBeNull()

    rerender(<ContentPillarsPanel {...base} failed pillars={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }))
    expect(base.onRetry).toHaveBeenCalledTimes(1)

    rerender(<ContentPillarsPanel {...base} pillars={[]} />)
    expect(screen.getByText('admin.socialPosts.pillars.empty')).toBeInTheDocument()
  })
})
