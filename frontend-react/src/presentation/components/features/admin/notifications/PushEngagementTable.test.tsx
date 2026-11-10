import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PushEngagement } from '@domain/admin/pushAdministration'
import { PushEngagementTable } from './PushEngagementTable'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => (options?.count === undefined ? key : `${key}:${options.count}`),
    i18n: { language: 'en-US', resolvedLanguage: 'en-US' },
  }),
}))
afterEach(cleanup)

const engagement: PushEngagement = {
  days: 7,
  since: '2026-10-19T03:00:00Z',
  types: [
    { type: 'TASTE_PICK', category: 'RECOMMENDATIONS', sent: 1200, opened: 300, openRate: 0.25, optedOut: 4, heldOut: 60, paused: false },
    { type: 'WINBACK', category: 'REMINDERS', sent: 0, opened: 0, openRate: null, optedOut: 0, heldOut: 0, paused: true },
  ],
}

function renderTable(overrides: Partial<Parameters<typeof PushEngagementTable>[0]> = {}) {
  const props = { engagement, days: 7 as const, loading: false, typeLabel: (type: string) => `label:${type}`, onDaysChange: vi.fn(), ...overrides }
  render(<PushEngagementTable {...props} />)
  return props
}

describe('engagement panel', () => {
  it('shows sent, opened, open rate, opt-outs and state per type', () => {
    renderTable()

    const taste = screen.getByRole('row', { name: /label:TASTE_PICK/ })
    expect(within(taste).getByText('1,200')).toBeInTheDocument()
    expect(within(taste).getByText('300')).toBeInTheDocument()
    expect(within(taste).getByText('25%')).toBeInTheDocument()
    expect(within(taste).getByText('4')).toBeInTheDocument()
    expect(within(taste).getByText('admin.notifications.engagement.active')).toBeInTheDocument()

    const winback = screen.getByRole('row', { name: /label:WINBACK/ })
    expect(within(winback).getByText('—')).toBeInTheDocument()
    expect(within(winback).getByText('admin.notifications.engagement.paused')).toBeInTheDocument()
  })

  it('changes the window', () => {
    const props = renderTable()

    fireEvent.click(screen.getByRole('button', { name: 'admin.notifications.metrics.days:30' }))

    expect(props.onDaysChange).toHaveBeenCalledWith(30)
    expect(screen.getByRole('button', { name: 'admin.notifications.metrics.days:7' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('says when nothing was sent in the window', () => {
    renderTable({ engagement: { ...engagement, types: [] } })

    expect(screen.getByText('admin.notifications.engagement.empty')).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('waits for the first answer without a table', () => {
    renderTable({ engagement: undefined, loading: true })

    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByText('admin.notifications.engagement.empty')).toBeNull()
  })
})
