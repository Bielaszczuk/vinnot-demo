import { Link, useParams } from "react-router-dom";
import { CalendarDays, MapPin, ArrowLeft, Ticket } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMyTickets } from "@/presentation/hooks/queries/event/useMyTickets";
import { useMyTicketDetailsViewModel } from "./useMyTicketDetailsViewModel";
import { useUrlFilters } from "@/presentation/hooks/useUrlFilters";
import { Button } from "@/presentation/components/ui/Button";
import { LinkButton } from "@/presentation/components/ui/LinkButton";
import { EmptyState } from "@/presentation/components/ui/EmptyState";
import { Icon } from "@/presentation/components/ui/Icon";
import { PageBanner } from "@/presentation/components/ui/PageBanner";
import { PageLoader } from "@/presentation/components/ui/PageLoader";
import { Pagination } from "@/presentation/components/ui/Pagination";
import { illustrations } from "@/shared/illustrations";
import { formatDate, formatDateTime, formatEventDate, formatTime } from "@/shared/utils/date";
import { formatPrice } from "@/shared/utils/format";
import { CoverImage } from "@/presentation/components/features/media/CoverImage";
import type { EventTicket } from "@/domain/event/eventTicket";

function TicketStatus({ ticket }: { ticket: EventTicket }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${ticket.status === "CONFIRMED" ? "bg-success-soft text-success" : "bg-wine-50 text-wine-700"}`}
    >
      {t(`events.registration.statuses.${ticket.status}`)}
    </span>
  );
}
export function MyTicketsPage() {
  const { t, i18n } = useTranslation();
  // The page lives in the URL so it survives Back from a ticket.
  const { page, update } = useUrlFilters([]);
  const setPage = (next: number) => update({ page: next });
  const query = useMyTickets(page);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageBanner title={t("tickets.title")} subtitle={t("tickets.subtitle")} icon={Ticket} />
      {query.isLoading ? (
        <PageLoader compact />
      ) : query.isError ? (
        <div role="alert" className="py-8">
          <p>{t("tickets.error")}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            {t("tickets.refresh")}
          </Button>
        </div>
      ) : (
        <>
          {!query.data?.tickets.length && (
            <EmptyState
              illustration="noTickets"
              title={t("tickets.empty")}
              action={
                <LinkButton to="/events" variant="secondary">
                  {t("tickets.explore")}
                </LinkButton>
              }
            />
          )}
          <div className="grid gap-4">
            {query.data?.tickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/my-tickets/${ticket.id}`}
                className="rounded-2xl border border-border bg-surface p-6 shadow-sm transition-colors hover:border-wine-300 focus-visible:outline-wine-600"
              >
                <TicketStatus ticket={ticket} />
                <h2 className="mt-3 text-xl font-semibold text-ink">{ticket.title}</h2>
                <p className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <Icon icon={CalendarDays} />
                  {formatEventDate(ticket.startDate, i18n.language)}
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <Icon icon={MapPin} />
                  {[ticket.locationName, ticket.locationCity]
                    .filter(Boolean)
                    .join(" · ") || t("tickets.locationPending")}
                </p>
                <p className="mt-4 text-sm font-medium text-wine-700">
                  {t("tickets.view")}
                </p>
              </Link>
            ))}
          </div>
          <Pagination page={page} totalPages={query.data?.totalPages ?? 0} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
export function MyTicketDetailsPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { ticket, isLoading, notFound, loadFailed, retry } =
    useMyTicketDetailsViewModel(id);
  return (
    <div className="mx-auto max-w-3xl">
      <LinkButton
        to="/my-tickets"
        variant="link"
        className="mb-6"
        leftIcon={<Icon icon={ArrowLeft} />}
      >
        {t("tickets.title")}
      </LinkButton>
      {isLoading ? (
        <PageLoader compact />
      ) : loadFailed ? (
        <div role="alert" className="space-y-4">
          <p>{t("tickets.loadError")}</p>
          <Button variant="outline" onClick={retry}>
            {t("common.retry")}
          </Button>
        </div>
      ) : notFound || !ticket ? (
        <p role="alert">{t("tickets.unavailable")}</p>
      ) : (
        <article className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-9">
          <CoverImage
            src={ticket.imageUrl ?? undefined}
            fallbackSrc={illustrations.event}
            alt=""
            className="mb-6 h-48 w-full rounded-2xl object-contain bg-wine-50/30"
          />
          <TicketStatus ticket={ticket} />
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">{ticket.title}</h1>
          {ticket.eventStatus === "CANCELLED" && (
            <p role="status" className="mt-4 rounded-lg bg-wine-50 p-3">
              {t("tickets.eventCancelled")}
            </p>
          )}
          <dl className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-gray-500">{t("tickets.date")}</dt>
              <dd className="mt-1">
                {formatDate(ticket.startDate, undefined, i18n.language)} ·{" "}
                {formatTime(ticket.startDate, i18n.language)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">{t("tickets.people")}</dt>
              <dd className="mt-1">{ticket.attendeeCount}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">{t("tickets.location")}</dt>
              <dd className="mt-1">
                {[
                  ticket.locationName,
                  ticket.locationAddress,
                  ticket.locationCity,
                ]
                  .filter(Boolean)
                  .join(" · ") || t("tickets.locationPending")}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">{t("tickets.payment")}</dt>
              <dd className="mt-1">
                {t(
                  `events.registrationManager.paymentStatuses.${ticket.paymentStatus}`,
                )}{" "}
                ·{" "}
                {ticket.totalAmount
                  ? formatPrice(ticket.totalAmount, ticket.currency, i18n.language)
                  : t("events.registrationManager.free")}
              </dd>
            </div>
          </dl>
          {ticket.expiresAt && (
            <p className="mt-6 text-sm text-gray-600">
              {t("events.registrationManager.reservationUntil", {
                date: formatDateTime(ticket.expiresAt, i18n.language),
              })}
            </p>
          )}
          {ticket.description && (
            <p className="mt-8 whitespace-pre-line leading-relaxed text-gray-600">
              {ticket.description}
            </p>
          )}
          {(ticket.contactEmail || ticket.contactPhone) && (
            <section className="mt-8 border-t pt-6">
              <h2 className="font-medium">{t("tickets.contact")}</h2>
              <p className="mt-2 text-gray-600">{ticket.contactEmail}</p>
              <p className="text-gray-600">{ticket.contactPhone}</p>
            </section>
          )}
          <LinkButton to={`/events/${ticket.eventId}`} variant="link" className="mt-8">
            {t("tickets.eventDetails")}
          </LinkButton>
          <p className="mt-6 text-xs text-gray-500">
            {t("tickets.reference")} {ticket.id.slice(-12).toUpperCase()}
          </p>
        </article>
      )}
    </div>
  );
}
