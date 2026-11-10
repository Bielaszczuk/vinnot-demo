import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  CHANNELS,
  PRICING,
  SCENARIOS,
  channelTotals,
  founderSavings,
  listPriceAt,
  monthInstalls,
  perHundred,
  project,
} from '../src/components/Presentation/growth.mjs';

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs');
const page = (language, name) => readFileSync(join(DOCS, language, 'business', `${name}.md`), 'utf8');
const at = (series, month) => series[month - 1];

// The documented table: cumulative installs and monthly active users at months 3, 6, 9 and 12.
const DOCUMENTED = {
  conservative: { installs: [473, 1047, 1719, 2490], mau: [179, 228, 280, 335] },
  base: { installs: [2459, 6005, 10616, 16301], mau: [1022, 1535, 2104, 2729] },
  optimistic: { installs: [9544, 23687, 42312, 65539], mau: [4201, 6685, 9562, 12844] },
};

describe('project', () => {
  it('matches the documented installs and active users of every scenario', () => {
    for (const [name, expected] of Object.entries(DOCUMENTED)) {
      const series = project(SCENARIOS[name]);
      assert.equal(series.length, 12);
      assert.deepEqual([3, 6, 9, 12].map(month => Math.round(at(series, month).cumulative)), expected.installs, name);
      assert.deepEqual([3, 6, 9, 12].map(month => Math.round(at(series, month).mau)), expected.mau, name);
    }
  });

  it('counts active users as new installs plus the retained share of earlier installs', () => {
    const series = project(SCENARIOS.base, 2);
    assert.equal(series[0].mau, series[0].installs);
    assert.equal(series[1].mau, series[1].installs + SCENARIOS.base.retention * series[0].cumulative);
  });

  it('splits the base year by channel as the documentation does', () => {
    const totals = channelTotals(project(SCENARIOS.base));
    assert.deepEqual(Object.keys(totals), CHANNELS);
    assert.deepEqual(
      Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, Math.round(value)])),
      { shops: 7371, events: 4080, social: 900, paid: 1200, wineries: 1170, wordOfMouth: 1580 },
    );
  });
});

describe('monthInstalls', () => {
  it('adds wine shops and wineries every month and word of mouth from last month', () => {
    const first = monthInstalls(SCENARIOS.base, 1, 0);
    const second = monthInstalls(SCENARIOS.base, 2, 1000);
    assert.equal(second.shops, first.shops * 2);
    assert.equal(second.wineries, first.wineries * 2);
    assert.equal(first.wordOfMouth, 60);
    assert.equal(second.wordOfMouth, 60 + 0.05 * 1000);
    assert.equal(first.paid, 100);
  });
});

describe('perHundred', () => {
  it('turns 100 wine-shop visitors into scans and installs', () => {
    const { scans, installs } = perHundred(SCENARIOS.base.shops);
    assert.equal(Math.round(scans * 10) / 10, 3);
    assert.equal(Math.round(installs * 10) / 10, 0.9);
  });
});

describe('pricing', () => {
  it('raises the list price by phase', () => {
    assert.deepEqual([0, 1, 6, 7, 12, 13, 24].map(month => listPriceAt(month, PRICING.phases)), [20, 20, 20, 35, 35, 50, 50]);
  });

  it('saves a founder winery USD 450 during the 24-month lock', () => {
    assert.equal(founderSavings(PRICING), 450);
  });

  it('only raises the price once the base scenario has the audience of the phase', () => {
    const series = project(SCENARIOS.base);
    for (const phase of PRICING.phases.slice(1)) {
      assert.ok(at(series, phase.from - 1).mau >= phase.mau, phase.key);
    }
  });
});

describe('documentation', () => {
  it('shows the projection and the founder savings in both languages', () => {
    const projection = { es: page('es', 'user-acquisition-projection'), en: page('en', 'user-acquisition-projection') };
    const pricing = { es: page('es', 'winery-pricing-roadmap'), en: page('en', 'winery-pricing-roadmap') };
    assert.ok(projection.es.includes('16.301') && projection.es.includes('2.729'));
    assert.ok(projection.en.includes('16,301') && projection.en.includes('2,729'));
    assert.ok(pricing.es.includes('USD 450') && pricing.en.includes('USD 450'));
  });
});
