/**
 * EventCard — event card component for list views
 *
 * Displays event summary info: image, type badge, date, title, location,
 * price in the event currency, attendee count and capacity bar.
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clock, MapPin, Users } from 'lucide-react'
import { CoverImage } from '@components/features/media/CoverImage'
import { Icon } from '@components/ui/Icon'
import type { Event } from '@domain/event/event.types'
import { calendarDaysUntil } from '@domain/event/eventCalendar'
import { illustrations } from '@shared/illustrations'
import { formatDate, formatTime } from '@utils/date'
import { formatPrice } from '@utils/format'
import { EventTypeIcon } from './EventTypeIcon'

function isUpcoming(date: Date | string): boolean {
  return new Date(date) > new Date()
}

interface EventCardProps {
  event: Event
  index: number
}

export function EventCard({ event }: EventCardProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const upcoming = isUpcoming(event.startDate)
  const days = calendarDaysUntil(event.startDate)
  const fallback = illustrations.event
  const startDate = new Date(event.startDate)

  const capacityPercent = event.maxAttendees
    ? Math.min(100, (event.currentAttendees / event.maxAttendees) * 100)
    : 0

  function formatDaysLabel(): string {
    if (days === 0) return t('events.today', 'Hoy')
    if (days === 1) return t('events.tomorrow', 'Mañana')
    if (days < 0) return t('events.past', 'Finalizado')
    if (days <= 7) return `${days} ${t('events.daysLeft', 'días')}`
    return ''
  }

  return (
    <Link to={`/events/${event.id}`} className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500 focus-visible:ring-offset-2">
      <div className="relative h-full overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-wine-950/10 active:scale-[0.98] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        {/* ── Image area ──────────────────────────────────────────── */}
        <div className="relative aspect-video overflow-hidden bg-surface-cream">
          <CoverImage
            src={event.imageUrl?.trim() || fallback}
            alt=""
            fallbackSrc={fallback}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 via-transparent to-transparent" />

          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-2xs font-semibold uppercase tracking-wider text-gray-800 shadow-sm backdrop-blur-sm">
            <EventTypeIcon type={event.type} className="h-3.5 w-3.5 shrink-0" />
            {t(`events.types.${event.type.toLowerCase()}`, event.type)}
          </span>

          {upcoming && days <= 7 && days >= 0 && (
            <span className="absolute right-3 top-3 rounded-full bg-warning-soft px-2.5 py-1 text-2xs font-bold uppercase tracking-wider text-warning shadow-sm">
              {formatDaysLabel()}
            </span>
          )}

          <div className="absolute bottom-3 left-3 rounded-xl border border-white/50 bg-white/95 px-3 py-1.5 shadow-lg backdrop-blur-sm">
            <p className="text-2xs font-bold uppercase leading-none text-wine-700">
              {formatDate(startDate, { month: 'short' }, locale)}
            </p>
            <p className="-mt-0.5 text-lg font-bold leading-tight text-ink">
              {startDate.getDate()}
            </p>
          </div>

          <div className="absolute bottom-3 right-3">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold shadow-sm ${
                event.price ? 'bg-gray-900/85 text-white' : 'bg-success text-white'
              }`}
            >
              {event.price ? formatPrice(event.price, event.registration?.currency, locale) : t('events.free')}
            </span>
          </div>
        </div>

        {/* ── Info area ───────────────────────────────────────────── */}
        <div className="space-y-2.5 p-4">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink transition-colors group-hover:text-wine-700 sm:text-base">
            {event.title}
          </h3>

          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Icon icon={Clock} size="xs" className="text-gray-400" />
            <span>{formatDate(event.startDate, undefined, locale)} · {formatTime(event.startDate, locale)}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Icon icon={MapPin} size="xs" className="text-gray-400" />
            <span className="truncate">
              {event.location.name || event.location.city}
              {event.location.region ? `, ${event.location.region}` : ''}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-2.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Icon icon={Users} size="xs" />
              <span>
                {t('events.attendeeCount', {
                  count: event.maxAttendees ?? event.currentAttendees,
                  value: `${event.currentAttendees}${event.maxAttendees ? `/${event.maxAttendees}` : ''}`,
                })}
              </span>
            </div>

            {event.maxAttendees ? (
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 motion-reduce:transition-none ${
                    capacityPercent > 85 ? 'bg-danger' : capacityPercent > 50 ? 'bg-warning' : 'bg-success'
                  }`}
                  style={{ width: `${capacityPercent}%` }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  )
}
