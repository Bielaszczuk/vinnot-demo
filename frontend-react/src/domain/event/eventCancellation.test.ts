import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CANCELLATION_REASON,
  EVENT_CANCELLATION_REASONS,
  MAX_CANCELLATION_NOTE_LENGTH,
  allowsCancellationNote,
  canCancelEvent,
  toCancellationRequest,
} from './eventCancellation'

describe('event cancellation', () => {
  it('lists the professional reasons in display order with the default first', () => {
    expect(EVENT_CANCELLATION_REASONS).toEqual([
      'UNFORESEEN_CIRCUMSTANCES',
      'SCHEDULING_CONFLICT',
      'VENUE_UNAVAILABLE',
      'INSUFFICIENT_ATTENDANCE',
      'WEATHER',
      'HEALTH_AND_SAFETY',
      'OTHER',
    ])
    expect(DEFAULT_CANCELLATION_REASON).toBe('UNFORESEEN_CIRCUMSTANCES')
    expect(EVENT_CANCELLATION_REASONS[0]).toBe(DEFAULT_CANCELLATION_REASON)
    expect(MAX_CANCELLATION_NOTE_LENGTH).toBe(280)
  })

  it('only allows a note for the other reason', () => {
    expect(allowsCancellationNote('OTHER')).toBe(true)
    expect(allowsCancellationNote('WEATHER')).toBe(false)
  })

  it('keeps a trimmed note only with the other reason', () => {
    expect(toCancellationRequest('OTHER', '  Private booking  ')).toEqual({ reason: 'OTHER', note: 'Private booking' })
    expect(toCancellationRequest('WEATHER', 'Storm')).toEqual({ reason: 'WEATHER' })
  })

  it('drops a blank or missing note', () => {
    expect(toCancellationRequest('OTHER', '   ')).toEqual({ reason: 'OTHER' })
    expect(toCancellationRequest('OTHER')).toEqual({ reason: 'OTHER' })
    expect(toCancellationRequest(DEFAULT_CANCELLATION_REASON)).toEqual({ reason: 'UNFORESEEN_CIRCUMSTANCES' })
  })

  it('lets an event be cancelled until it is cancelled or completed', () => {
    expect(canCancelEvent('PUBLISHED')).toBe(true)
    expect(canCancelEvent('DRAFT')).toBe(true)
    expect(canCancelEvent('CANCELLED')).toBe(false)
    expect(canCancelEvent('COMPLETED')).toBe(false)
  })
})
