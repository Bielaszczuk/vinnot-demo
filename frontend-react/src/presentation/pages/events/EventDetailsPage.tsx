import { hasCoordinates } from '@domain/location/coordinates'
import { hasOrganizerDetails } from '@domain/event/eventOrganizer'
import { CommunityActions } from '@components/features/community/CommunityActions'
import { QueryErrorState } from '@components/ui/QueryErrorState'
/**
 * EventDetailsPage — event detail page
 *
 * Shows full event information, register/cancel actions, organizer,
 * map embed/coordinates, and sidebar with capacity/price.
 * Migrated from Vue EventDetailsPage.vue.
 */

import { ArrowLeft, CalendarDays, Map as MapIcon, MapPin, Share2, UserRound, Users } from 'lucide-react'
import { Button } from '@components/ui/Button'
import { EmptyState } from '@components/ui/EmptyState'
import { Icon } from '@components/ui/Icon'
import { LinkButton } from '@components/ui/LinkButton'
import { PageLoader } from '@components/ui/PageLoader'
import { GoogleMapsEmbed } from '@components/ui/GoogleMapsEmbed'
import { MapView } from '@components/ui/MapView'
import { useEventDetailsViewModel } from './useEventDetailsViewModel'
import { EventDetailsHero } from './EventDetailsHero'
import { EventDetailsSidebar } from './EventDetailsSidebar'
import { EventRegistrationModal } from './EventRegistrationModal'

/* ── component ─────────────────────────────────────────────────────── */

export function EventDetailsPage() {
  const {
    t,
    event,
    isLoading,
    isError,
    error,
    retry,
    isUpcoming,
    daysUntil,
    capacityPercent,
    isSoldOut,
    formattedDateRange,
    capacityColor,
    registerPending,
    registration,
    registrationModalOpen,
    setRegistrationModalOpen,
    registrationDefaultName,
    registrationDefaultEmail,
    registrationDefaultPhone,
    handleRegister,
    submitRegistration,
    confirmAttendance,
    cancelRegistration,
    payNow,
    registrationActionPending,
    canShare,
    shareEvent,
    openInMaps,
    goBack,
  } = useEventDetailsViewModel()

  /* ── render ──────────────────────────────────────────────────────── */

  return (
    <div className="mx-auto max-w-5xl">
      <Button variant="ghost" size="sm" onClick={goBack} leftIcon={<Icon icon={ArrowLeft} />} className="mb-4 -ml-2 sm:mb-6">
        {t('common.back')}
      </Button>

      {isLoading && <PageLoader />}

      {/* Error */}
      {isError && !isLoading && <QueryErrorState error={error} onRetry={() => void retry()} />}

      {/* Main content */}
      {event && !isLoading && (
        <>
          <EventDetailsHero
            event={event}
            t={t}
            isUpcoming={isUpcoming}
            daysUntil={daysUntil}
          />

          {/* ═══════════ MAIN CONTENT GRID ═══════════ */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
            {/* LEFT COLUMN (2/3) */}
            <div className="space-y-4 sm:space-y-6 lg:col-span-2">
              {/* Title & Meta */}
              <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6 md:p-8">
                <h1 className="text-xl font-semibold leading-tight tracking-tight text-ink sm:text-2xl lg:text-3xl">
                  {event.title}
                </h1>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Icon icon={CalendarDays} className="text-gray-400" />
                    <span>{formattedDateRange}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon icon={MapPin} className="text-gray-400" />
                    <span>
                      {event.location.city}
                      {event.location.region ? `, ${event.location.region}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon icon={Users} className="text-gray-400" />
                    <span>
                      {t('events.attendeeCount', {
                        count: event.maxAttendees ?? event.currentAttendees,
                        value: `${event.currentAttendees}${event.maxAttendees ? `/${event.maxAttendees}` : ''}`,
                      })}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-5">
                  {canShare && (
                    <Button variant="outline" size="sm" onClick={shareEvent} leftIcon={<Icon icon={Share2} />}>
                      {t('events.share')}
                    </Button>
                  )}

                  {(event.location.latitude || event.location.address) && (
                    <Button variant="outline" size="sm" onClick={openInMaps} leftIcon={<Icon icon={MapIcon} />}>
                      {t('events.openMaps')}
                    </Button>
                  )}
                  <CommunityActions
                    variant="menu"
                    targetType="EVENT"
                    targetId={event.id}
                    ownerId={event.organizer.id}
                    allowBlock={false}
                  />
                </div>
              </div>

              {/* Description */}
              {event.description && (
                <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {t('events.aboutEvent')}
                  </h3>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
                    {event.description}
                  </p>
                </div>
              )}

              {/* Map embed */}
              {event.mapEmbedUrl && (
                <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {t('events.location')}
                  </h3>
                  <div className="overflow-hidden rounded-xl">
                    <GoogleMapsEmbed mode="place" query={event.mapEmbedUrl} height="350px" />
                  </div>
                </div>
              )}

              {!event.mapEmbedUrl && hasCoordinates(event.location) && (
                <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {t('events.location')}
                  </h3>
                  <div className="overflow-hidden rounded-xl">
                    <MapView
                      latitude={event.location.latitude}
                      longitude={event.location.longitude}
                      markerTitle={event.location.name || event.title}
                      height="350px"
                    />
                  </div>
                </div>
              )}

              {/* Organizer */}
              {hasOrganizerDetails(event.organizer) && (
                <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {t('events.organizer')}
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-wine-50">
                      <Icon icon={UserRound} size="md" className="text-wine-700" />
                    </div>
                    <div>
                      {event.organizer.name && (
                        <p className="text-sm font-semibold text-ink">{event.organizer.name}</p>
                      )}
                      {event.organizer.email && (
                        <p className="text-xs text-gray-500">{event.organizer.email}</p>
                      )}
                      {event.organizer.phone && (
                        <p className="text-xs text-gray-500">{event.organizer.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <EventDetailsSidebar
              event={event}
              t={t}
                registerPending={registerPending}
              handleRegister={handleRegister}
              registration={registration}
              confirmAttendance={confirmAttendance}
              cancelRegistration={() => void cancelRegistration()}
                payNow={payNow}
              registrationActionPending={registrationActionPending}
              isSoldOut={isSoldOut}
              capacityPercent={capacityPercent}
              capacityColor={capacityColor}
              isUpcoming={isUpcoming}
            />
          </div>
          {registrationModalOpen ? (
            <EventRegistrationModal
              event={event}
              isOpen
              isSubmitting={registerPending}
              defaultName={registrationDefaultName}
              defaultEmail={registrationDefaultEmail}
              defaultPhone={registrationDefaultPhone}
              onClose={() => setRegistrationModalOpen(false)}
              onSubmit={submitRegistration}
            />
          ) : null}
        </>
      )}

      {/* Not found (no event & finished loading) */}
      {!event && !isLoading && !isError && (
        <EmptyState
          illustration="event"
          title={t('events.notFound')}
          action={
            <LinkButton to="/events" variant="secondary" leftIcon={<Icon icon={ArrowLeft} />}>
              {t('events.backToEvents')}
            </LinkButton>
          }
        />
      )}
    </div>
  )
}
