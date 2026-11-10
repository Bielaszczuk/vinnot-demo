import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SocialPost } from '@domain/admin/socialPost'
import { SocialPostSchedule } from './SocialPostSchedule'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
    i18n: { language: 'es-AR', resolvedLanguage: 'es-AR' },
  }),
}))
afterEach(cleanup)

const post = {
  id: 'p1', status: 'APPROVED', scheduledFor: '2026-11-10T15:30:00Z', wineDay: null,
  canReschedule: true, canPublishNow: true,
  networkSchedule: [
    { network: 'INSTAGRAM', publishAt: '2026-11-10T15:30:00Z' },
    { network: 'TIKTOK', publishAt: '2026-11-10T22:30:00Z' },
  ],
} as unknown as SocialPost

const handlers = {
  setDate: vi.fn(), setTime: vi.fn(), startReschedule: vi.fn(), cancelReschedule: vi.fn(), saveSchedule: vi.fn(),
  startPublishNow: vi.fn(), cancelPublishNow: vi.fn(), confirmPublishNow: vi.fn(),
}
const base = {
  post, working: false, busy: false, rescheduling: false, date: '2026-11-10', time: '12:30', canSave: true, confirmingPublishNow: false,
  formatTime: (iso: string) => `time:${iso}`, ...handlers,
}

describe('social post schedule', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists the time of each network in Argentina time', () => {
    render(<SocialPostSchedule {...base} />)
    const list = screen.getByRole('list', { name: 'admin.socialPosts.schedule.networks' })
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'admin.socialPosts.networks.INSTAGRAMtime:2026-11-10T15:30:00Z',
      'admin.socialPosts.networks.TIKTOKtime:2026-11-10T22:30:00Z',
    ])
    expect(screen.getByText('admin.socialPosts.schedule.argentinaTime')).toBeInTheDocument()
  })

  it('offers each action only when the post allows it', () => {
    const { rerender } = render(<SocialPostSchedule {...base} />)
    expect(screen.getByRole('button', { name: 'admin.socialPosts.schedule.change' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'admin.socialPosts.schedule.publishNow' })).toBeInTheDocument()

    rerender(<SocialPostSchedule {...base} post={{ ...post, canReschedule: false }} />)
    expect(screen.queryByRole('button', { name: 'admin.socialPosts.schedule.change' })).toBeNull()
    expect(screen.getByRole('button', { name: 'admin.socialPosts.schedule.publishNow' })).toBeInTheDocument()

    rerender(<SocialPostSchedule {...base} post={{ ...post, canPublishNow: false }} />)
    expect(screen.getByRole('button', { name: 'admin.socialPosts.schedule.change' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'admin.socialPosts.schedule.publishNow' })).toBeNull()
  })

  it('shows nothing for a post without network times nor actions', () => {
    const { container } = render(<SocialPostSchedule {...base} post={{ ...post, canReschedule: false, canPublishNow: false, networkSchedule: [] }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('opens the form, edits the Argentina date and time and saves or cancels', () => {
    const { rerender } = render(<SocialPostSchedule {...base} />)
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.schedule.change' }))
    expect(handlers.startReschedule).toHaveBeenCalled()

    rerender(<SocialPostSchedule {...base} rescheduling />)
    const date = screen.getByLabelText('admin.socialPosts.schedule.date')
    const time = screen.getByLabelText('admin.socialPosts.schedule.time')
    expect(date).toHaveValue('2026-11-10')
    expect(time).toHaveValue('12:30')
    expect(screen.getByText('admin.socialPosts.schedule.argentinaTimeHint')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'admin.socialPosts.schedule.change' })).toBeNull()

    fireEvent.change(date, { target: { value: '2026-11-12' } })
    fireEvent.change(time, { target: { value: '09:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.schedule.save' }))
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))
    expect(handlers.setDate).toHaveBeenCalledWith('2026-11-12')
    expect(handlers.setTime).toHaveBeenCalledWith('09:30')
    expect(handlers.saveSchedule).toHaveBeenCalled()
    expect(handlers.cancelReschedule).toHaveBeenCalled()

    rerender(<SocialPostSchedule {...base} rescheduling canSave={false} />)
    expect(screen.getByRole('button', { name: 'admin.socialPosts.schedule.save' })).toBeDisabled()
  })

  it('warns that the copy of a wine-day post mentions its day', () => {
    const { rerender } = render(<SocialPostSchedule {...base} rescheduling />)
    expect(screen.queryByText(/admin\.socialPosts\.schedule\.wineDayWarning/)).toBeNull()

    const wineDay = { code: 'MERLOT', nameEs: 'Día del Merlot', nameEn: 'Merlot Day', date: '2026-11-07' }
    rerender(<SocialPostSchedule {...base} rescheduling post={{ ...post, wineDay }} />)
    expect(screen.getByText('admin.socialPosts.schedule.wineDayWarning {"day":"Día del Merlot"}')).toBeInTheDocument()
  })

  it('confirms before publishing now', () => {
    const { rerender } = render(<SocialPostSchedule {...base} />)
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.schedule.publishNow' }))
    expect(handlers.startPublishNow).toHaveBeenCalled()
    expect(handlers.confirmPublishNow).not.toHaveBeenCalled()

    rerender(<SocialPostSchedule {...base} confirmingPublishNow />)
    expect(screen.getByText('admin.socialPosts.schedule.publishNowConfirm')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'admin.socialPosts.schedule.confirmPublishNow' }))
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))
    expect(handlers.confirmPublishNow).toHaveBeenCalled()
    expect(handlers.cancelPublishNow).toHaveBeenCalled()
  })

  it('disables its actions while any action runs', () => {
    const { rerender } = render(<SocialPostSchedule {...base} working />)
    expect(screen.getByRole('button', { name: 'admin.socialPosts.schedule.change' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'admin.socialPosts.schedule.publishNow' })).toBeDisabled()

    rerender(<SocialPostSchedule {...base} busy confirmingPublishNow />)
    expect(screen.getByRole('button', { name: 'admin.socialPosts.schedule.confirmPublishNow' })).toBeDisabled()
  })
})
