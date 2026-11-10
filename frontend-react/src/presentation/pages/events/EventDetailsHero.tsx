import { useTranslation } from "react-i18next";
import { EventTypeIcon } from '@components/features/event/EventTypeIcon'
import { illustrations } from "@shared/illustrations";
import { CoverImage } from "@components/features/media/CoverImage";
import type { Event } from "@domain/event/event.types";
import type { TFunction } from "i18next";
import { formatDate } from "@utils/date";
import { formatPrice } from "@utils/format";


type EventDetailsHeroProps = {
  event: Event;
  t: TFunction;
  isUpcoming: boolean;
  daysUntil: number;
};

export function EventDetailsHero({ event, t, isUpcoming, daysUntil }: EventDetailsHeroProps) {
  const { i18n } = useTranslation();
  return (
    <div className="relative mb-4 overflow-hidden rounded-xl sm:mb-6 sm:rounded-2xl">
      <div className="aspect-[21/9] bg-gray-100 sm:aspect-[21/8]">
          <CoverImage
            src={event.imageUrl ?? undefined}
            alt=""
            fallbackSrc={illustrations.event}
            className="h-full w-full object-cover"
          />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-gray-900/20 to-transparent" />

      <div className="absolute bottom-4 left-4 rounded-xl bg-white/95 px-4 py-2 shadow-lg backdrop-blur-sm sm:bottom-6 sm:left-6">
        <p className="text-xs font-bold uppercase leading-none text-wine-700">
          {formatDate(event.startDate, { month: "short" }, i18n.language)}
        </p>
        <p className="text-2xl font-bold leading-tight text-ink">
          {new Date(event.startDate).getDate()}
        </p>
      </div>

      <div className="absolute bottom-4 right-4 flex items-center gap-2 sm:bottom-6 sm:right-6">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm backdrop-blur-sm">
          <EventTypeIcon type={event.type} />
          {t(`events.types.${event.type.toLowerCase()}`, event.type)}
        </span>
        <span
          className={`rounded-full px-3 py-1.5 text-sm font-bold shadow-sm backdrop-blur-sm ${
            event.price ? "bg-gray-900/85 text-white" : "bg-success text-white"
          }`}
        >
          {event.price ? formatPrice(event.price, event.registration?.currency, i18n.language) : t("events.free")}
        </span>
      </div>

      {isUpcoming && daysUntil <= 7 && daysUntil >= 0 && (
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <span className="animate-pulse rounded-full bg-warning-soft px-3 py-1.5 text-xs font-bold uppercase text-warning shadow-sm motion-reduce:animate-none">
            {daysUntil === 0
              ? t("events.today")
              : daysUntil === 1
                ? t("events.tomorrow")
                : `${daysUntil} ${t("events.daysLeft")}`}
          </span>
        </div>
      )}
    </div>
  );
}
