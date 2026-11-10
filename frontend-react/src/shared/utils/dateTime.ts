export function localDateTimeToIso(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

export function splitLocalDateTime(value: string | null | undefined) {
  const [date = '', time = ''] = value?.split('T') ?? []
  return { date, time: time.slice(0, 5) }
}

export function combineLocalDateTime(date: string, time: string) {
  return date ? `${date}T${time || '00:00'}` : ''
}
