// Revenue model behind docs/*/business/revenue-simulator.mdx (#482, S4 and S5): ticket commission,
// winery subscriptions net of the store fee, and break-even against the monthly costs.
// The costs come from the CostProjection model, so both simulators share one source of truth.
// Kept free of React for node --test.

import { CURRENT_MONTHLY_USD, SCENARIOS, monthlyCost } from '../CostProjection/projection.mjs';

/** Implemented rate (TicketPaymentQuote.COMMISSION_BASIS_POINTS = 300) and the planned ones. */
export const COMMISSION_PRESETS = [3, 8, 12];
export const COMMISSION_MIN = 0;
export const COMMISSION_MAX = 20;

/** App Store first year without the Small Business Program (30 %), or 15 % otherwise and on Google Play. */
export const STORE_FEE_PRESETS = [15, 30];

/** Planned price of the winery Pro plan, in USD per month. */
export const SUBSCRIPTION_PRICE_USD = 20;

/** Defaults; ticket price and exchange rate are editable assumptions, not quotes. */
export const DEFAULTS = {
  commissionPercent: 3,
  eventsPerMonth: 4,
  ticketsPerEvent: 30,
  ticketPriceArs: 20000,
  arsPerUsd: 1450,
  proWineries: 0,
  subscriptionUsd: SUBSCRIPTION_PRICE_USD,
  storeFeePercent: 15,
  monthlyCostUsd: CURRENT_MONTHLY_USD,
};

/** Monthly cost presets: today's measured cost and the projected cost of each scenario. */
export const COST_PRESETS = [
  { id: 'today', users: 0, usd: CURRENT_MONTHLY_USD },
  ...SCENARIOS.map(users => ({ id: `users-${users}`, users, usd: monthlyCost(users) })),
];

/** Rounds to cents. */
const cents = value => Math.round(value * 100) / 100;

/** Keeps a number finite and not negative. */
export const nonNegative = value => (Number.isFinite(value) && value > 0 ? value : 0);

/**
 * Commission revenue per month and per year.
 * @param {{ commissionPercent: number, eventsPerMonth: number, ticketsPerEvent: number, ticketPriceArs: number, arsPerUsd: number }} input
 */
export const commissionRevenue = ({ commissionPercent, eventsPerMonth, ticketsPerEvent, ticketPriceArs, arsPerUsd }) => {
  const rate = Math.min(COMMISSION_MAX, nonNegative(commissionPercent)) / 100;
  const tickets = Math.round(nonNegative(eventsPerMonth) * nonNegative(ticketsPerEvent));
  const grossArs = tickets * nonNegative(ticketPriceArs);
  const commissionArs = cents(grossArs * rate);
  const exchange = nonNegative(arsPerUsd);
  const monthlyUsd = exchange === 0 ? 0 : cents(commissionArs / exchange);
  const perTicketUsd = exchange === 0 ? 0 : (nonNegative(ticketPriceArs) * rate) / exchange;
  return { tickets, grossArs, commissionArs, monthlyUsd, annualUsd: cents(monthlyUsd * 12), perTicketUsd };
};

/**
 * Winery subscription revenue after the store fee.
 * @param {{ wineries: number, priceUsd: number, storeFeePercent: number }} input
 */
export const subscriptionNet = ({ wineries, priceUsd, storeFeePercent }) => {
  const fee = Math.min(100, nonNegative(storeFeePercent)) / 100;
  const perSubscriberUsd = cents(nonNegative(priceUsd) * (1 - fee));
  const monthlyUsd = cents(Math.round(nonNegative(wineries)) * perSubscriberUsd);
  return { perSubscriberUsd, monthlyUsd, annualUsd: cents(monthlyUsd * 12) };
};

/**
 * Units needed to cover a monthly cost; null when a unit earns nothing.
 * @param {number} monthlyCostUsd
 * @param {number} perUnitUsd
 */
export const unitsToCover = (monthlyCostUsd, perUnitUsd) =>
  perUnitUsd > 0 ? Math.ceil(nonNegative(monthlyCostUsd) / perUnitUsd - 1e-9) : null;

/**
 * Totals, margin and break-even for one set of inputs.
 * @param {typeof DEFAULTS} input
 */
export const breakEven = input => {
  const commission = commissionRevenue(input);
  const subscriptions = subscriptionNet({
    wineries: input.proWineries,
    priceUsd: input.subscriptionUsd,
    storeFeePercent: input.storeFeePercent,
  });
  const cost = cents(nonNegative(input.monthlyCostUsd));
  const revenue = cents(commission.monthlyUsd + subscriptions.monthlyUsd);
  const margin = cents(revenue - cost);
  return {
    commission,
    subscriptions,
    cost,
    revenue,
    margin,
    annualMargin: cents(margin * 12),
    covered: cost === 0 ? 1 : Math.min(1, revenue / cost),
    ticketsNeeded: unitsToCover(cost, commission.perTicketUsd),
    wineriesNeeded: unitsToCover(cost, subscriptions.perSubscriberUsd),
  };
};

/**
 * Money in the locale's format.
 * @param {number} value
 * @param {'USD' | 'ARS'} currency
 * @param {string} locale 'es' or 'en'
 */
export const formatMoney = (value, currency, locale) =>
  new Intl.NumberFormat(locale === 'es' ? 'es-AR' : 'en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    maximumFractionDigits: currency === 'ARS' || Math.abs(value) >= 1000 ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(value);

/** Eased value between two numbers for counters; `t` runs from 0 to 1. */
export const tween = (from, to, t) => {
  const clamped = Math.min(1, Math.max(0, t));
  const eased = 1 - (1 - clamped) ** 3;
  return from + (to - from) * eased;
};

/** Width of a bar as a percentage of the largest value shown. */
export const barPercent = (value, max) => (max > 0 ? Math.round((Math.max(0, value) / max) * 1000) / 10 : 0);

const ES = {
  title: 'Simulador de ingresos',
  commission: 'Comisión sobre entradas',
  custom: 'Otra',
  events: 'Eventos pagos por mes',
  tickets: 'Entradas por evento',
  ticketPrice: 'Precio medio de la entrada (ARS)',
  exchange: 'Tipo de cambio (ARS por USD)',
  wineries: 'Bodegas en el plan Pro',
  price: 'Precio del plan Pro (USD por mes)',
  storeFee: 'Comisión de la tienda',
  cost: 'Costo mensual a cubrir',
  costPresets: { today: 'Hoy', users: users => `${users.toLocaleString('es-AR')} usuarios` },
  commissionRevenue: 'Comisión',
  subscriptionRevenue: 'Suscripciones netas',
  revenue: 'Ingreso total',
  costs: 'Costos',
  margin: 'Margen',
  perMonth: 'por mes',
  perYear: 'por año',
  ticketsNeeded: count => (count === null ? 'Con comisión 0 % las entradas no cubren costos.' : `Entradas por mes para cubrir costos solo con comisión: ${count.toLocaleString('es-AR')}`),
  wineriesNeeded: count => (count === null ? 'Sin ingreso por suscripción no hay punto de equilibrio.' : `Bodegas Pro para cubrir costos solo con suscripciones: ${count.toLocaleString('es-AR')}`),
  covered: share => `Los ingresos cubren el ${Math.round(share * 100)} % de los costos.`,
  ticketsSold: count => `${count.toLocaleString('es-AR')} entradas por mes`,
  perSubscriber: value => `Neto por bodega: ${value}`,
  estimate: 'Estimación. No incluye impuestos (IVA, Ingresos Brutos, Ganancias) ni la variación del tipo de cambio.',
};

const EN = {
  title: 'Revenue simulator',
  commission: 'Ticket commission',
  custom: 'Other',
  events: 'Paid events per month',
  tickets: 'Tickets per event',
  ticketPrice: 'Average ticket price (ARS)',
  exchange: 'Exchange rate (ARS per USD)',
  wineries: 'Wineries on the Pro plan',
  price: 'Pro plan price (USD per month)',
  storeFee: 'Store fee',
  cost: 'Monthly cost to cover',
  costPresets: { today: 'Today', users: users => `${users.toLocaleString('en-US')} users` },
  commissionRevenue: 'Commission',
  subscriptionRevenue: 'Net subscriptions',
  revenue: 'Total revenue',
  costs: 'Costs',
  margin: 'Margin',
  perMonth: 'per month',
  perYear: 'per year',
  ticketsNeeded: count => (count === null ? 'At a 0% commission, tickets cover no costs.' : `Tickets per month to cover costs with the commission alone: ${count.toLocaleString('en-US')}`),
  wineriesNeeded: count => (count === null ? 'Without subscription revenue there is no break-even.' : `Pro wineries to cover costs with subscriptions alone: ${count.toLocaleString('en-US')}`),
  covered: share => `Revenue covers ${Math.round(share * 100)}% of the costs.`,
  ticketsSold: count => `${count.toLocaleString('en-US')} tickets per month`,
  perSubscriber: value => `Net per winery: ${value}`,
  estimate: 'Estimate. Excludes taxes (VAT, gross income tax, income tax) and exchange-rate changes.',
};

/** Labels for the component; `es` for Spanish, English otherwise. */
export const revenueLabels = locale => (locale === 'es' ? ES : EN);
