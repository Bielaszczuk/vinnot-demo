import forbidden from "./assets/illustrations/403.webp";
import notFound from "./assets/illustrations/404.webp";
import rateLimit from "./assets/illustrations/429.webp";
import server from "./assets/illustrations/500.webp";
import unavailable from "./assets/illustrations/503.webp";
import emptyCellar from "./assets/illustrations/emptycellar.webp";
import event from "./assets/illustrations/event.webp";
import legal from "./assets/illustrations/legal.webp";
import offline from "./assets/illustrations/noconection.webp";
import privacy from "./assets/illustrations/privacy.webp";
import route from "./assets/illustrations/routes.webp";
import timeout from "./assets/illustrations/timeout.webp";
import winery from "./assets/illustrations/winery.webp";
import noWines from "./assets/illustrations/nowines.webp";
import noTickets from "./assets/illustrations/notickets.webp";
import noReviews from "./assets/illustrations/noreviews.webp";
import community from "./assets/illustrations/community.webp";
import partnerEvents from "./assets/illustrations/partnerevents.webp";
import notifications from "./assets/illustrations/notifications.webp";

/** Bundler imports give every illustration an immutable, content-hashed CDN URL. */
export const illustrations = {
  forbidden,
  notFound,
  rateLimit,
  server,
  unavailable,
  emptyCellar,
  event,
  legal,
  offline,
  privacy,
  route,
  timeout,
  winery,
  noWines,
  noTickets,
  noReviews,
  community,
  partnerEvents,
  notifications,
} as const;
