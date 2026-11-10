import { describe, expect, it } from 'vitest'
import {
  combineLocalDateTime,
  splitLocalDateTime,
} from '@shared/utils/dateTime'

describe('EventDateTimeField value helpers', () => {
  it('keeps the local date and minute precision used by the event form', () => {
    expect(splitLocalDateTime('2026-07-25T20:05:37')).toEqual({
      date: '2026-07-25',
      time: '20:05',
    })
  })

  it('builds the backend-compatible local datetime without timezone conversion', () => {
    expect(combineLocalDateTime('2026-07-25', '20:05')).toBe('2026-07-25T20:05')
  })

  it('clears the complete value when no date is selected', () => {
    expect(combineLocalDateTime('', '20:05')).toBe('')
  })
})
