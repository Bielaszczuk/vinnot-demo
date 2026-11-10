/**
 * RouteStopTimeline — expandable timeline of route stops
 *
 * Renders the stop list as a vertical timeline with expand/collapse.
 * Displays stop details, winery links, contact info, and "Open in Maps" buttons.
 */

import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Clock, ExternalLink, Flag, Globe, Landmark, Mail, MapPin, Phone, Play } from 'lucide-react'
import { Button } from '@components/ui/Button'
import { Icon } from '@components/ui/Icon'
import { LinkButton } from '@components/ui/LinkButton'
import { hasCoordinates } from '@domain/location/coordinates'
import type { RouteStop } from '@domain/route/route.types'
import { formatDuration } from '@utils/format'

interface RouteStopTimelineProps {
  stops: RouteStop[]
}

export function RouteStopTimeline({ stops }: RouteStopTimelineProps) {
  const { t } = useTranslation()
  const [expandedStop, setExpandedStop] = useState<string | null>(null)

  const toggleStop = useCallback((stopId: string) => {
    setExpandedStop((prev) => (prev === stopId ? null : stopId))
  }, [])

  const openStopInMaps = useCallback((stop: RouteStop) => {
    if (hasCoordinates(stop.location)) {
      window.open(`https://maps.google.com/?q=${stop.location.latitude},${stop.location.longitude}`, '_blank')
    } else if (stop.location.address) {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(stop.location.address)}`, '_blank')
    }
  }, [])

  if (stops.length === 0) return null

  return (
    <div className="rounded-xl border border-gray-200/60 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
      <h3 className="mb-6 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {t('routes.routeStops', 'Route stops')}
      </h3>

      <div className="relative">
        {/* Timeline vertical line */}
        <div aria-hidden="true" className="absolute bottom-6 left-5 top-6 w-0.5 rounded-full bg-gradient-to-b from-wine-300 via-wine-200 to-wine-100 sm:left-6" />

        <ol className="space-y-0">
          {stops.map((stop, idx) => {
            const isFirst = idx === 0
            const isLast = idx === stops.length - 1
            const isExpanded = expandedStop === stop.id
            const detailsId = `route-stop-${stop.id}`

            return (
              <li key={stop.id} className="group relative">
                <div className={`flex items-start gap-4 rounded-xl p-3 transition-colors duration-200 sm:p-4 ${isExpanded ? 'bg-wine-50/50' : 'hover:bg-gray-50'}`}>
                  {/* Timeline dot */}
                  <div className="relative z-10 flex-shrink-0">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold shadow-sm transition-colors duration-300 ${
                        isFirst
                          ? 'bg-wine-700 text-white'
                          : isLast
                            ? 'bg-success text-white'
                            : isExpanded
                              ? 'bg-wine-100 text-wine-700 ring-2 ring-wine-300'
                              : 'bg-white text-gray-700 ring-2 ring-gray-200 group-hover:ring-wine-200'
                      }`}
                    >
                      {isFirst ? <Icon icon={Play} /> : isLast ? <Icon icon={Flag} /> : <span>{idx + 1}</span>}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={detailsId}
                      onClick={() => toggleStop(stop.id)}
                      className="flex w-full items-start gap-3 rounded-lg pt-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 sm:text-base">{stop.name}</span>
                          <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-2xs font-medium text-gray-600">
                            {t(`routes.stopTypes.${stop.type}`, stop.type)}
                          </span>
                        </span>
                        <span className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                          {stop.duration > 0 && (
                            <span className="flex items-center gap-1">
                              <Icon icon={Clock} size="xs" className="text-gray-400" />
                              {formatDuration(stop.duration)}
                            </span>
                          )}
                          {stop.location.city && (
                            <span className="flex items-center gap-1">
                              <Icon icon={MapPin} size="xs" className="text-gray-400" />
                              {stop.location.city}
                            </span>
                          )}
                        </span>
                      </span>
                      <Icon
                        icon={ChevronDown}
                        className={`mt-0.5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div id={detailsId} className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                        {stop.description && (
                          <p className="text-sm leading-relaxed text-gray-600">{stop.description}</p>
                        )}

                        {stop.location.address && (
                          <div className="flex items-start gap-2 text-sm text-gray-500">
                            <Icon icon={MapPin} className="mt-0.5 text-gray-400" />
                            <span>{stop.location.address}</span>
                          </div>
                        )}

                        {stop.winery && (
                          <LinkButton to={`/wineries/${stop.winery.id}`} variant="secondary" size="sm" leftIcon={<Icon icon={Landmark} />}>
                            {stop.winery.name}
                          </LinkButton>
                        )}

                        {stop.type === 'winery' && stop.winery && <WineryContactBlock winery={stop.winery} />}

                        {(stop.location.latitude || stop.location.address) && (
                          <Button variant="outline" size="sm" onClick={() => openStopInMaps(stop)} leftIcon={<Icon icon={ExternalLink} size="xs" />}>
                            {t('events.openMaps', 'Open in Maps')}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

/* ── sub-component ──────────────────────────────────────────────────── */

const contactLink = 'flex items-center gap-2 text-xs text-gray-600 transition-colors hover:text-wine-700'

function WineryContactBlock({ winery }: { winery: { email?: string | null; phone?: string | null; website?: string | null } }) {
  const { t } = useTranslation()
  const hasContact = !!(winery.email || winery.phone || winery.website)
  if (!hasContact) return null

  return (
    <div className="space-y-2 rounded-lg bg-gray-50 p-3">
      <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-gray-500">
        <Icon icon={Phone} size="xs" />
        {t('routes.contact')}
      </p>
      <div className="space-y-1.5">
        {winery.phone && (
          <a href={`tel:${winery.phone}`} className={contactLink}>
            <Icon icon={Phone} size="xs" className="text-gray-400" />
            <span>{winery.phone}</span>
          </a>
        )}
        {winery.email && (
          <a href={`mailto:${winery.email}`} className={contactLink}>
            <Icon icon={Mail} size="xs" className="text-gray-400" />
            <span>{winery.email}</span>
          </a>
        )}
        {winery.website && (
          <a
            href={winery.website.startsWith('http') ? winery.website : `https://${winery.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className={contactLink}
          >
            <Icon icon={Globe} size="xs" className="text-gray-400" />
            <span>{winery.website}</span>
          </a>
        )}
      </div>
    </div>
  )
}
