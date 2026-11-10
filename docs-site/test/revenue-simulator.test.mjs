import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COMMISSION_MAX,
  COMMISSION_PRESETS,
  COST_PRESETS,
  DEFAULTS,
  STORE_FEE_PRESETS,
  SUBSCRIPTION_PRICE_USD,
  barPercent,
  breakEven,
  commissionRevenue,
  formatMoney,
  nonNegative,
  revenueLabels,
  subscriptionNet,
  tween,
  unitsToCover,
} from '../src/components/RevenueSimulator/revenue.mjs';

describe('presets', () => {
  it('offers the implemented 3 % and the planned 8 % and 12 %', () => {
    assert.deepEqual(COMMISSION_PRESETS, [3, 8, 12]);
    assert.deepEqual(STORE_FEE_PRESETS, [15, 30]);
    assert.equal(SUBSCRIPTION_PRICE_USD, 20);
    assert.equal(DEFAULTS.commissionPercent, 3);
    assert.equal(DEFAULTS.proWineries, 0);
  });

  it('takes the cost presets from the cost model', () => {
    assert.deepEqual(COST_PRESETS.map(preset => [preset.id, preset.usd]), [
      ['today', 83.31],
      ['users-1000', 80.68],
      ['users-5000', 124.71],
      ['users-10000', 153.21],
      ['users-50000', 716.89],
    ]);
    assert.equal(DEFAULTS.monthlyCostUsd, 83.31);
  });
});

describe('commissionRevenue', () => {
  it('reproduces the worked example of the payments module: ARS 600 on two tickets of ARS 10,000', () => {
    const result = commissionRevenue({ commissionPercent: 3, eventsPerMonth: 1, ticketsPerEvent: 2, ticketPriceArs: 10000, arsPerUsd: 1000 });
    assert.equal(result.grossArs, 20000);
    assert.equal(result.commissionArs, 600);
    assert.equal(result.monthlyUsd, 0.6);
  });

  it('scales with the rate', () => {
    const at = percent => commissionRevenue({ ...DEFAULTS, commissionPercent: percent });
    assert.deepEqual(
      [3, 8, 12].map(percent => [at(percent).commissionArs, at(percent).monthlyUsd, at(percent).annualUsd]),
      [
        [72000, 49.66, 595.92],
        [192000, 132.41, 1588.92],
        [288000, 198.62, 2383.44],
      ],
    );
    assert.equal(at(3).tickets, 120);
  });

  it('caps the rate and ignores invalid inputs', () => {
    const capped = commissionRevenue({ ...DEFAULTS, commissionPercent: 90 });
    assert.equal(capped.commissionArs, 2400000 * (COMMISSION_MAX / 100));
    const broken = commissionRevenue({ commissionPercent: Number.NaN, eventsPerMonth: -2, ticketsPerEvent: 5, ticketPriceArs: 100, arsPerUsd: 0 });
    assert.deepEqual(broken, { tickets: 0, grossArs: 0, commissionArs: 0, monthlyUsd: 0, annualUsd: 0, perTicketUsd: 0 });
  });
});

describe('subscriptionNet', () => {
  it('leaves USD 17 per winery at 15 % and USD 14 at 30 %', () => {
    assert.deepEqual(subscriptionNet({ wineries: 10, priceUsd: 20, storeFeePercent: 15 }), { perSubscriberUsd: 17, monthlyUsd: 170, annualUsd: 2040 });
    assert.equal(subscriptionNet({ wineries: 1, priceUsd: 20, storeFeePercent: 30 }).perSubscriberUsd, 14);
    assert.equal(subscriptionNet({ wineries: 1, priceUsd: 20, storeFeePercent: 150 }).perSubscriberUsd, 0);
  });
});

describe('breakEven', () => {
  it('compares revenue with costs', () => {
    const result = breakEven(DEFAULTS);
    assert.equal(result.revenue, 49.66);
    assert.equal(result.cost, 83.31);
    assert.equal(result.margin, -33.65);
    assert.equal(result.annualMargin, -403.8);
    assert.equal(Math.round(result.covered * 100), 60);
    assert.equal(result.ticketsNeeded, 202);
    assert.equal(result.wineriesNeeded, 5);
  });

  it('caps the covered share at 100 % and handles a zero cost', () => {
    assert.equal(breakEven({ ...DEFAULTS, proWineries: 10 }).covered, 1);
    assert.equal(breakEven({ ...DEFAULTS, monthlyCostUsd: 0 }).covered, 1);
  });

  it('gives the break-even of each scenario at each rate', () => {
    const tickets = (percent, cost) => breakEven({ ...DEFAULTS, commissionPercent: percent, monthlyCostUsd: cost }).ticketsNeeded;
    assert.deepEqual(COST_PRESETS.map(preset => [3, 8, 12].map(percent => tickets(percent, preset.usd))), [
      [202, 76, 51],
      [195, 74, 49],
      [302, 114, 76],
      [371, 139, 93],
      [1733, 650, 434],
    ]);
    assert.deepEqual(COST_PRESETS.map(preset => breakEven({ ...DEFAULTS, monthlyCostUsd: preset.usd }).wineriesNeeded), [5, 5, 8, 10, 43]);
  });
});

describe('helpers', () => {
  it('counts units to cover a cost', () => {
    assert.equal(unitsToCover(34, 17), 2);
    assert.equal(unitsToCover(35, 17), 3);
    assert.equal(unitsToCover(10, 0), null);
  });

  it('keeps numbers finite and positive', () => {
    assert.equal(nonNegative(Number.POSITIVE_INFINITY), 0);
    assert.equal(nonNegative(-1), 0);
    assert.equal(nonNegative(3), 3);
  });

  it('formats money per locale and currency', () => {
    assert.match(formatMoney(83.31, 'USD', 'en'), /^USD\s83\.31$/);
    assert.match(formatMoney(1234.5, 'USD', 'en'), /^USD\s1,235$/);
    assert.match(formatMoney(20000, 'ARS', 'es'), /^ARS\s20\.000$/);
  });

  it('eases counters and sizes bars', () => {
    assert.equal(tween(0, 100, -1), 0);
    assert.equal(tween(0, 100, 2), 100);
    assert.equal(tween(0, 100, 0.5), 87.5);
    assert.equal(barPercent(50, 200), 25);
    assert.equal(barPercent(-5, 200), 0);
    assert.equal(barPercent(5, 0), 0);
  });
});

describe('revenueLabels', () => {
  it('writes the dynamic texts in both languages', () => {
    const es = revenueLabels('es');
    const en = revenueLabels('en');
    assert.equal(es.ticketsNeeded(1733), 'Entradas por mes para cubrir costos solo con comisión: 1.733');
    assert.equal(en.ticketsNeeded(1733), 'Tickets per month to cover costs with the commission alone: 1,733');
    assert.match(es.ticketsNeeded(null), /0 %/);
    assert.match(en.ticketsNeeded(null), /0%/);
    assert.equal(es.wineriesNeeded(43), 'Bodegas Pro para cubrir costos solo con suscripciones: 43');
    assert.equal(en.wineriesNeeded(43), 'Pro wineries to cover costs with subscriptions alone: 43');
    assert.match(es.wineriesNeeded(null), /equilibrio/);
    assert.match(en.wineriesNeeded(null), /break-even/);
    assert.equal(es.covered(0.6), 'Los ingresos cubren el 60 % de los costos.');
    assert.equal(en.covered(0.6), 'Revenue covers 60% of the costs.');
    assert.equal(es.ticketsSold(1200), '1.200 entradas por mes');
    assert.equal(en.ticketsSold(1200), '1,200 tickets per month');
    assert.equal(es.perSubscriber('USD 17'), 'Neto por bodega: USD 17');
    assert.equal(en.perSubscriber('USD 17'), 'Net per winery: USD 17');
    assert.equal(es.costPresets.users(5000), '5.000 usuarios');
    assert.equal(en.costPresets.users(5000), '5,000 users');
    assert.equal(revenueLabels('fr').title, 'Revenue simulator');
  });
});
