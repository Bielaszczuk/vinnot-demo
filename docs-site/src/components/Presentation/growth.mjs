// @ts-check
// The 12-month user acquisition projection and the winery pricing roadmap.
// docs/{es,en}/business/user-acquisition-projection.md explains every input and its source.

/** Days counted in a month of wine-shop traffic. */
export const DAYS = 30;
/** Share of ticket buyers who use the app; the other 30% use the web. */
export const TICKET_APP_SHARE = 0.7;
/** Influencer stories: share of followers reached, swipe rate and store conversion. */
export const STORY = { reach: 0.2, swipe: 0.01, conversion: 0.25 };

export const CHANNELS = ['shops', 'events', 'social', 'paid', 'wineries', 'wordOfMouth'];

/**
 * Inputs per scenario.
 * shops: wine shops added per month, visitors per day, QR scan rate, scan-to-install rate.
 * events: attendees reached per month, booth install rate, Vinnot ticket buyers per month.
 * social: posts per month, views per post, click rate, store conversion, collabs per month, followers per collab.
 * paid: budget in USD per month and cost per install.
 * wineries: wineries added per month, tasting-room visitors per month, scan rate, install rate.
 * wordOfMouth: store-search baseline per month and installs per active user of the previous month.
 * retention: share of earlier installs still active in a month.
 */
export const SCENARIOS = {
  conservative: {
    shops: { added: 3, visitors: 30, scan: 0.015, install: 0.2 },
    events: { attendees: 2067, install: 0.02, buyers: 60 },
    social: { posts: 12, views: 500, click: 0.005, conversion: 0.2, collabs: 0, followers: 15000 },
    paid: { budget: 100, cpi: 6.65 },
    wineries: { added: 1, visitors: 125, scan: 0.1, install: 0.2 },
    wordOfMouth: { baseline: 30, k: 0.02 },
    retention: 0.03,
  },
  base: {
    shops: { added: 7, visitors: 50, scan: 0.03, install: 0.3 },
    events: { attendees: 4000, install: 0.05, buyers: 200 },
    social: { posts: 16, views: 1500, click: 0.01, conversion: 0.25, collabs: 2, followers: 15000 },
    paid: { budget: 300, cpi: 3 },
    wineries: { added: 2, visitors: 125, scan: 0.2, install: 0.3 },
    wordOfMouth: { baseline: 60, k: 0.05 },
    retention: 0.05,
  },
  optimistic: {
    shops: { added: 10, visitors: 60, scan: 0.05, install: 0.35 },
    events: { attendees: 9800, install: 0.08, buyers: 600 },
    social: { posts: 20, views: 5000, click: 0.015, conversion: 0.25, collabs: 4, followers: 30000 },
    paid: { budget: 600, cpi: 1.5 },
    wineries: { added: 4, visitors: 200, scan: 0.3, install: 0.4 },
    wordOfMouth: { baseline: 120, k: 0.1 },
    retention: 0.08,
  },
};

/** @typedef {typeof SCENARIOS.base} Scenario */
/** @typedef {Record<string, number>} Channels */

/**
 * New installs per channel in a month. Shops and wineries accumulate: month m has m months of recruits.
 * @param {Scenario} x @param {number} month @param {number} previousMau
 * @returns {Channels}
 */
export function monthInstalls(x, month, previousMau) {
  const { shops, events, social, paid, wineries, wordOfMouth } = x;
  return {
    shops: shops.added * month * shops.visitors * shops.scan * shops.install * DAYS,
    events: events.attendees * events.install + events.buyers * TICKET_APP_SHARE,
    social:
      social.posts * social.views * social.click * social.conversion +
      social.collabs * social.followers * STORY.reach * STORY.swipe * STORY.conversion,
    paid: paid.budget / paid.cpi,
    wineries: wineries.added * month * wineries.visitors * wineries.scan * wineries.install,
    wordOfMouth: wordOfMouth.baseline + wordOfMouth.k * previousMau,
  };
}

const sum = (/** @type {Channels} */ channels) => Object.values(channels).reduce((total, value) => total + value, 0);

/**
 * Month by month: new installs, cumulative installs and monthly active users.
 * Active users in a month are its new installs plus the retained share of all earlier installs.
 * @param {Scenario} x @param {number} [months]
 */
export function project(x, months = 12) {
  const series = [];
  let cumulative = 0;
  let mau = 0;
  for (let month = 1; month <= months; month += 1) {
    const channels = monthInstalls(x, month, mau);
    const installs = sum(channels);
    mau = installs + x.retention * cumulative;
    cumulative += installs;
    series.push({ month, channels, installs, cumulative, mau });
  }
  return series;
}

/**
 * Installs per channel over the whole series.
 * @param {ReturnType<typeof project>} series
 * @returns {Channels}
 */
export function channelTotals(series) {
  return Object.fromEntries(CHANNELS.map(key => [key, series.reduce((total, point) => total + point.channels[key], 0)]));
}

/**
 * Out of 100 people who walk into a wine shop: how many scan the QR and how many install.
 * @param {Scenario['shops']} shops
 */
export const perHundred = shops => ({ scans: 100 * shops.scan, installs: 100 * shops.scan * shops.install });

/**
 * Winery subscription roadmap. A phase starts at its month once active users reach its threshold.
 * Founders keep the first price for lockMonths.
 */
export const PRICING = {
  founderSeats: 50,
  lockMonths: 24,
  phases: [
    { key: 'founders', from: 1, usd: 20, mau: 0 },
    { key: 'growth', from: 7, usd: 35, mau: 1500 },
    { key: 'scale', from: 13, usd: 50, mau: 2500 },
  ],
};

/**
 * List price for a new winery in a month, by calendar.
 * @param {number} month @param {typeof PRICING.phases} phases
 */
export function listPriceAt(month, phases) {
  return phases.filter(phase => phase.from <= month).at(-1)?.usd ?? phases[0].usd;
}

/**
 * What a founder winery saves during the lock against the list price.
 * @param {typeof PRICING} pricing
 */
export function founderSavings(pricing) {
  const locked = pricing.phases[0].usd;
  let saved = 0;
  for (let month = 1; month <= pricing.lockMonths; month += 1) saved += listPriceAt(month, pricing.phases) - locked;
  return saved;
}
