import { canCancelRegistration, canRegisterAgain, canStartOnlinePayment } from '@domain/event/eventRegistrationActions'
import { eventRegistrationAvailability } from '@domain/event/eventRegistrationFeedback'
import { CalendarDays, Check, Info, MapPin, Ticket } from 'lucide-react'
import { useTranslation } from "react-i18next";
import { EventTypeIcon } from '@components/features/event/EventTypeIcon'
import { Button } from "@components/ui/Button";
import { Icon } from "@components/ui/Icon";
import { LinkButton } from "@components/ui/LinkButton";
import { formatDate, formatTime } from "@utils/date";
import { formatPrice } from "@utils/format";
import type { Event, EventRegistration } from "@domain/event/event.types";
import type { TFunction } from "i18next";

type EventDetailsSidebarProps = {
  event: Event;
  t: TFunction;
  registerPending: boolean;
  handleRegister: () => void;
  registration: EventRegistration | null;
  confirmAttendance: () => void;
  cancelRegistration?: () => void;
  payNow?: () => void;
  registrationActionPending: boolean;
  isSoldOut: boolean;
  capacityPercent: number;
  capacityColor: string;
  isUpcoming: boolean;
};

export function EventDetailsSidebar({
  event,
  t,
  registerPending,
  handleRegister,
  registration,
  confirmAttendance,
  cancelRegistration,
  payNow,
  registrationActionPending,
  isSoldOut,
  capacityPercent,
  capacityColor,
  isUpcoming,
}: EventDetailsSidebarProps) {
  const locale = useTranslation().i18n.language || undefined;
  const price = event.price ? formatPrice(event.price, event.registration?.currency, locale) : null;
  const availability = eventRegistrationAvailability(event);
  const registrationOpen = availability === "OPEN" && !isSoldOut;
  const ctaLabel = availability === "SOLD_OUT" || isSoldOut
    ? t("events.soldOut")
    : availability === "CLOSED" ? t("events.registrationClosed") : t("events.register");
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="bg-gradient-to-r from-wine-700 to-wine-800 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-wine-200">{t("events.price")}</p>
              <p className="mt-0.5 text-2xl font-bold text-white">{price ?? t("events.free")}</p>
            </div>
            {!event.price && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <Icon icon={Ticket} size="md" className="text-white" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5 p-5">
          {event.status === "CANCELLED" && (
            <p role="status" className="rounded-xl border border-danger/20 bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
              {t("events.cancelledNotice")}
            </p>
          )}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-wine-50">
              <Icon icon={CalendarDays} className="text-wine-700" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">{t("events.dateAndTime")}</p>
              <p className="mt-0.5 text-sm font-semibold text-ink">{formatDate(event.startDate, undefined, locale)}</p>
              <p className="text-xs text-gray-500">{formatTime(event.startDate, locale)} – {formatTime(event.endDate, locale)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-wine-50">
              <Icon icon={MapPin} className="text-wine-700" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">{t("events.location")}</p>
              <p className="mt-0.5 text-sm font-semibold text-ink">{event.location.name}</p>
              {event.location.address && <p className="text-xs text-gray-500">{event.location.address}</p>}
              <p className="text-xs text-gray-500">
                {event.location.city}
                {event.location.region ? `, ${event.location.region}` : ""}
              </p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">{t("events.attendees")}</p>
              <p className="text-sm font-semibold text-ink">
                {event.currentAttendees}
                {event.maxAttendees ? ` / ${event.maxAttendees}` : ""}
              </p>
            </div>

            {event.maxAttendees ? (
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out motion-reduce:transition-none ${capacityColor}`}
                  style={{ width: `${capacityPercent}%` }}
                />
              </div>
            ) : null}

            {isSoldOut && <p className="mt-1.5 text-xs font-medium text-danger">{t("events.soldOut")}</p>}
            {!isSoldOut && event.maxAttendees && capacityPercent > 75 && (
              <p className="mt-1.5 text-xs font-medium text-warning">{t("events.almostFull")}</p>
            )}
          </div>

          {registration ? (
            <div className="space-y-3 rounded-xl border border-wine-100 bg-wine-50 p-3">
              <p className="text-xs font-semibold uppercase text-wine-700">{t("events.registration.yours")}</p>
              <p className="text-sm font-medium text-gray-900">
                {t(`events.registrationManager.statuses.${registration.status}`)} · {t("events.registration.attendee", { count: registration.attendeeCount })}
              </p>
              {registration.organizerNote ? (
                <p className="text-xs text-gray-600">{registration.organizerNote}</p>
              ) : null}
              {registration.status === 'AWAITING_ATTENDEE_CONFIRMATION' ? (
                <Button onClick={confirmAttendance} disabled={registrationActionPending} className="w-full">
                  {t("events.registration.confirmAttendance")}
                </Button>
              ) : null}
              {canStartOnlinePayment(registration) ? (
                <Button onClick={payNow} disabled={registrationActionPending || !payNow} className="w-full">
                  {t("eventBooking.payNow")}
                </Button>
              ) : null}
              {canRegisterAgain(registration) && availability !== "CLOSED" && (
                <Button onClick={handleRegister} disabled={registerPending || isSoldOut || !event.isAvailable} className="w-full">
                  {t("eventBooking.registerAgain")}
                </Button>
              )}
              {cancelRegistration && canCancelRegistration(registration) ? (
                <Button variant="ghost" onClick={cancelRegistration} disabled={registrationActionPending} className="w-full">
                  {t("events.registration.cancelRegistration")}
                </Button>
              ) : null}
              {registration.contactActionUrl ? (
                <LinkButton href={registration.contactActionUrl} external variant="secondary" className="w-full">
                  {t("events.registration.contactOrganizer")}
                </LinkButton>
              ) : null}
            </div>
          ) : (
          <Button
            size="lg"
            onClick={handleRegister}
            disabled={!registrationOpen}
            isLoading={registerPending}
            leftIcon={registrationOpen ? <Icon icon={Check} /> : undefined}
            className="w-full"
          >
            {ctaLabel}
          </Button>
          )}
        </div>
      </div>

      {event.tags.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">{t("events.tags")}</h3>
          <div className="flex flex-wrap gap-1.5">
            {event.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-100">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-wine-100/60 bg-surface-cream p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-wine-700">
            <Icon icon={Info} className="text-white" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-700">{t("events.quickInfo")}</h3>
        </div>

        <div className="space-y-2.5 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">{t("events.eventType")}</span>
            <span className="flex items-center gap-1 font-medium text-gray-700">
              <EventTypeIcon type={event.type} />
              {t(`events.types.${event.type.toLowerCase()}`, event.type)}
            </span>
          </div>

          {event.price ? (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">{t("events.price")}</span>
              <span className="font-medium text-gray-700">{price}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <span className="text-gray-500">{t("events.status")}</span>
            {event.status === "CANCELLED" ? (
              <span className="font-medium text-danger">{t("events.statusLabels.cancelled")}</span>
            ) : (
              <span className={`font-medium ${isUpcoming ? "text-success" : "text-gray-500"}`}>
                {isUpcoming ? t("events.upcoming") : t("events.past")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
