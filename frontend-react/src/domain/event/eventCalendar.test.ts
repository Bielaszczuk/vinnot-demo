import { describe, expect, it } from 'vitest'
import { calendarDaysUntil } from './eventCalendar'

describe('calendarDaysUntil', () => {
  it('reads an event later today as today, even when it is more than half a day away', () => {
    expect(calendarDaysUntil(new Date(2026, 9, 20, 23, 30), new Date(2026, 9, 20, 0, 10))).toBe(0)
    expect(calendarDaysUntil(new Date(2026, 9, 20, 8, 0), new Date(2026, 9, 20, 21, 0))).toBe(0)
  })

  it('reads tomorrow by date, wherever the hours fall', () => {
    expect(calendarDaysUntil(new Date(2026, 9, 21, 0, 30), new Date(2026, 9, 20, 23, 50))).toBe(1)
    expect(calendarDaysUntil(new Date(2026, 9, 21, 23, 0), new Date(2026, 9, 20, 1, 0))).toBe(1)
  })

  it('counts later days and past ones, across months', () => {
    expect(calendarDaysUntil(new Date(2026, 10, 2, 10, 0), new Date(2026, 9, 30, 22, 0))).toBe(3)
    expect(calendarDaysUntil(new Date(2026, 9, 19, 23, 0), new Date(2026, 9, 20, 0, 5))).toBe(-1)
    expect(calendarDaysUntil(new Date(2026, 9, 25).toISOString(), new Date(2026, 9, 20, 12, 0))).toBe(5)
  })
})
