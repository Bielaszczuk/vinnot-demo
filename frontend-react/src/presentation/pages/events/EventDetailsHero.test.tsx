import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TFunction } from 'i18next'
import type { Event } from '@domain/event/event.types'
import { EventDetailsHero } from './EventDetailsHero'
import { formatPrice } from '@utils/format'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'es-AR' } }) }))
afterEach(cleanup)

const t = ((key: string) => key) as unknown as TFunction
const event = { title: 'Cata', type: 'TASTING', startDate: '2026-10-20T21:00:00.000Z', price: 0, imageUrl: null } as unknown as Event

describe('event details hero', () => {
  it('says today for an event later today and tomorrow for one tomorrow', () => {
    render(<EventDetailsHero event={event} t={t} isUpcoming daysUntil={0} />)
    expect(screen.getByText('events.today')).toBeInTheDocument()
    cleanup()
    render(<EventDetailsHero event={event} t={t} isUpcoming daysUntil={1} />)
    expect(screen.getByText('events.tomorrow')).toBeInTheDocument()
  })

  it('shows no countdown for a past event or one more than a week away', () => {
    render(<EventDetailsHero event={event} t={t} isUpcoming={false} daysUntil={0} />)
    expect(screen.queryByText('events.today')).not.toBeInTheDocument()
    cleanup()
    render(<EventDetailsHero event={event} t={t} isUpcoming daysUntil={8} />)
    expect(screen.queryByText(/events.daysLeft/)).not.toBeInTheDocument()
  })

  it('shows a paid price in the event currency and the app language', () => {
    render(<EventDetailsHero event={{ ...event, price: 2500, registration: { currency: 'USD' } } as unknown as Event} t={t} isUpcoming={false} daysUntil={9} />)
    expect(screen.getByText(/2\.500/).textContent).toBe(formatPrice(2500, 'USD', 'es-AR'))
    expect(screen.queryByText(/\$2500/)).toBeNull()
  })
})
