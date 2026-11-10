import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WineDay } from '@domain/admin/socialPost'
import { WineDayList } from './WineDayList'

const language = vi.hoisted(() => ({ current: 'es-AR' as string | undefined }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
    i18n: { language: 'en-US', resolvedLanguage: language.current },
  }),
}))
afterEach(cleanup)

const days: WineDay[] = [
  { code: 'MERLOT', nameEs: 'Día del Merlot', nameEn: 'Merlot Day', kind: 'GRAPE', priority: 1, countryCode: null, date: '2026-11-07' },
  { code: 'TEMPRANILLO', nameEs: 'Día del Tempranillo', nameEn: 'Tempranillo Day', kind: 'GRAPE', priority: 2, countryCode: 'ES', date: '2026-11-12' },
  { code: 'SAPERAVI', nameEs: 'Día del Saperavi', nameEn: 'Saperavi Day', kind: 'GRAPE', priority: 3, countryCode: 'GE', date: '2026-11-30' },
]
const base = { days, loading: false, failed: false, formatDay: (date: string) => `day:${date}`, onRetry: vi.fn() }

describe('wine day list', () => {
  it('lists each day with its date, localized name and priority', () => {
    language.current = 'es-AR'
    render(<WineDayList {...base} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('day:2026-11-07')
    expect(items[0]).toHaveTextContent('Día del Merlot')
    expect(screen.getByLabelText('admin.socialPosts.wineDays.priority {"priority":1}')).toHaveClass('bg-wine-700')
    expect(screen.getByLabelText('admin.socialPosts.wineDays.priority {"priority":2}')).toHaveClass('bg-wine-100')
    expect(screen.getByLabelText('admin.socialPosts.wineDays.priority {"priority":3}')).toHaveClass('bg-gray-100')
  })

  it('uses the English names when the locale is not Spanish', () => {
    language.current = undefined
    render(<WineDayList {...base} />)
    expect(screen.getByText('Merlot Day')).toBeInTheDocument()
  })

  it('shows the error, the spinner or the empty message', () => {
    const { rerender } = render(<WineDayList {...base} failed />)
    fireEvent.click(screen.getByText('common.retry'))
    expect(base.onRetry).toHaveBeenCalled()

    rerender(<WineDayList {...base} loading />)
    expect(screen.getByRole('status')).toBeInTheDocument()

    rerender(<WineDayList {...base} days={[]} />)
    expect(screen.getByText('admin.socialPosts.wineDays.empty')).toBeInTheDocument()
  })
})
