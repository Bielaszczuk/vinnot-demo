import { BookOpen, CalendarDays, Grape, Landmark, Map, Ticket, Trophy, Utensils, Wine, Wrench, type LucideIcon } from 'lucide-react'
import type { EventType } from '@domain/event/event.types'

const icons: Record<EventType, LucideIcon> = {
  TASTING: Wine, FESTIVAL: Ticket, TOUR: Map, WORKSHOP: Wrench,
  DINNER: Utensils, PAIRING: Utensils, HARVEST: Grape, FAIR: Landmark,
  COMPETITION: Trophy, CLASS: BookOpen, OTHER: CalendarDays,
}

export function EventTypeIcon({ type, className = 'h-4 w-4 shrink-0' }: { type: EventType; className?: string }) {
  const Icon = icons[type] ?? CalendarDays
  return <Icon className={className} aria-hidden="true" />
}
