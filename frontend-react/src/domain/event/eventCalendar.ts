const DAY_MS = 86_400_000

/**
 * Calendar days from `now` to `date` in the viewer's time zone: 0 is today, 1 tomorrow, negative in the past.
 * Counting calendar days, not 24-hour blocks, keeps an event later today from reading "tomorrow".
 */
export function calendarDaysUntil(date: Date | string, now: Date = new Date()): number {
  const target = new Date(date)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  return Math.round((day.getTime() - today.getTime()) / DAY_MS)
}
