import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ASSUMPTIONS,
  CURRENT_COSTS,
  CURRENT_MONTHLY_USD,
  DB_MEMORY_MB,
  FIXED_MONTHLY,
  LIMITS,
  MEASURED_ON,
  MODEL_MAX_USERS,
  MODEL_MIN_USERS,
  SCALE_STEPS,
  SCENARIOS,
  SERVICES,
  TIERS,
  aiPlan,
  annualCost,
  bottlenecks,
  cents,
  clampUsers,
  emailPlan,
  expoPlan,
  firstBottleneck,
  fixedMonthly,
  mapsPlan,
  mobileUsers,
  monthlyBreakdown,
  monthlyCost,
  peakLoad,
  planFor,
  projectionLabels,
  usersForDbMemory,
} from '../src/components/CostProjection/projection.mjs';

// The capacity page quotes these numbers; a change here must change the page in both languages.
const PAGE_TABLE = {
  1000: { total: 80.68, annual: 968.16, plans: ['t3a-small', 'postgres-on-host', 'in-process', 'cloudfront-free', 'workers-free', 'expo-free', 'ai-budget-today', 'ses', 'maps-free', 'github-actions'] },
  5000: { total: 124.71, annual: 1496.52, plans: ['t3a-medium', 'postgres-on-host', 'in-process', 'cloudfront-free', 'workers-free', 'expo-starter', 'ai-budget-raised', 'ses', 'maps-free', 'github-actions'] },
  10000: { total: 153.21, annual: 1838.52, plans: ['t3a-medium', 'postgres-on-host', 'in-process', 'cloudfront-free', 'workers-free', 'expo-starter', 'ai-budget-raised', 'ses', 'maps-free', 'github-actions'] },
  50000: { total: 716.89, annual: 8602.68, plans: ['two-t3a-medium-alb', 'rds-multi-az', 'valkey-micro', 'cloudfront-pro', 'workers-paid', 'expo-starter', 'ai-budget-raised', 'ses', 'maps-paid', 'github-actions'] },
};

describe('measured costs', () => {
  it('dates the figures and sums the October lines to USD 83.31', () => {
    assert.equal(MEASURED_ON, '2026-10-29');
    assert.deepEqual(CURRENT_COSTS, { aws: 38.74, githubActions: 33.05, openai: 2.4, domain: 0.87, apple: 8.25 });
    assert.equal(CURRENT_MONTHLY_USD, 83.31);
  });

  it('keeps USD 25.50 of fixed lines in every scenario', () => {
    assert.deepEqual(FIXED_MONTHLY, { dev: 14.65, otherAws: 1.67, apple: 8.25, domain: 0.93 });
    assert.equal(fixedMonthly(), 25.5);
  });

  it('rounds to cents', () => {
    assert.equal(cents(19.934), 19.93);
    assert.equal(cents(19.936), 19.94);
  });
});

describe('tiers', () => {
  it('derives the database thresholds from memory', () => {
    assert.equal(ASSUMPTIONS.hotDataKbPerUser, 50);
    assert.equal(usersForDbMemory(DB_MEMORY_MB.smallHost), 3000);
    assert.equal(usersForDbMemory(DB_MEMORY_MB.mediumHost), 20000);
    assert.equal(usersForDbMemory(DB_MEMORY_MB.rdsMedium), 60000);
  });

  it('prices each plan as on the page', () => {
    assert.deepEqual(TIERS.compute.map(tier => [tier.id, tier.upTo, tier.usd]), [
      ['t3a-small', 3000, 19.93],
      ['t3a-medium', 20000, 33.66],
      ['t3a-medium-app', 35000, 32.38],
      ['two-t3a-medium-alb', 60000, 94.33],
    ]);
    assert.deepEqual(TIERS.database.map(tier => [tier.id, tier.upTo, tier.usd]), [
      ['postgres-on-host', 20000, 0],
      ['rds-single-az', 35000, 53.2],
      ['rds-multi-az', 60000, 105.67],
    ]);
    assert.deepEqual(TIERS.cache.map(tier => [tier.id, tier.upTo, tier.usd]), [
      ['in-process', 35000, 0],
      ['valkey-micro', 60000, 9.34],
    ]);
    assert.deepEqual(TIERS.cdn.map(tier => [tier.id, tier.upTo, tier.usd]), [
      ['cloudfront-free', 27777, 0],
      ['cloudfront-pro', 60000, 15],
    ]);
    assert.deepEqual(TIERS.images.map(tier => [tier.id, tier.upTo, tier.usd]), [
      ['workers-free', 25000, 0],
      ['workers-paid', 60000, 5],
    ]);
  });

  it('ends every tier list at the top of the model', () => {
    for (const tiers of Object.values(TIERS)) assert.equal(tiers[tiers.length - 1].upTo, MODEL_MAX_USERS);
  });
});

describe('scenarios', () => {
  it('lists the four scales and slider steps that include them', () => {
    assert.deepEqual(SCENARIOS, [1000, 5000, 10000, 50000]);
    for (const users of SCENARIOS) assert.ok(SCALE_STEPS.includes(users));
    assert.equal(SCALE_STEPS[0], MODEL_MIN_USERS);
    assert.equal(SCALE_STEPS[SCALE_STEPS.length - 1], MODEL_MAX_USERS);
  });

  for (const [users, expected] of Object.entries(PAGE_TABLE)) {
    it(`matches the page table at ${users} users`, () => {
      const breakdown = monthlyBreakdown(Number(users));
      assert.deepEqual(breakdown.services.map(line => line.service), SERVICES);
      assert.deepEqual(breakdown.services.map(line => line.id), expected.plans);
      assert.equal(breakdown.total, expected.total);
      assert.equal(monthlyCost(Number(users)), expected.total);
      assert.equal(annualCost(Number(users)), expected.annual);
      assert.equal(breakdown.fixed, 25.5);
    });
  }

  it('clamps scales outside the model', () => {
    assert.equal(clampUsers(10), MODEL_MIN_USERS);
    assert.equal(clampUsers(1e6), MODEL_MAX_USERS);
    assert.equal(clampUsers(1234.4), 1234);
    assert.equal(monthlyBreakdown(1e6).users, MODEL_MAX_USERS);
  });
});

describe('variable services', () => {
  it('counts mobile users as 70 % of MAU, rounding up', () => {
    assert.equal(mobileUsers(1000), 700);
    assert.equal(mobileUsers(1428), 1000);
    assert.equal(mobileUsers(1429), 1001);
  });

  it('picks the cheapest Expo plan', () => {
    assert.deepEqual(expoPlan(1428), { id: 'expo-free', usd: 0 });
    assert.deepEqual(expoPlan(1429), { id: 'expo-starter', usd: 19 });
    assert.deepEqual(expoPlan(5000), { id: 'expo-starter', usd: 21.5 });
    assert.deepEqual(expoPlan(10000), { id: 'expo-starter', usd: 39 });
    assert.deepEqual(expoPlan(50000), { id: 'expo-starter', usd: 179 });
    assert.deepEqual(expoPlan(60000), { id: 'expo-production', usd: 199 });
  });

  it('keeps the AI cap at USD 8 until spend passes it, then rounds the cap up to tens', () => {
    assert.deepEqual(aiPlan(1000), { id: 'ai-budget-today', usd: 2, budget: 8 });
    assert.deepEqual(aiPlan(4000), { id: 'ai-budget-today', usd: 8, budget: 8 });
    assert.deepEqual(aiPlan(5000), { id: 'ai-budget-raised', usd: 10, budget: 10 });
    assert.deepEqual(aiPlan(50000), { id: 'ai-budget-raised', usd: 100, budget: 100 });
  });

  it('prices SES per thousand emails', () => {
    assert.deepEqual(emailPlan(50000), { id: 'ses', usd: 10, emails: 100000 });
  });

  it('charges web map loads above the free allowance only', () => {
    assert.deepEqual(mapsPlan(10000), { id: 'maps-free', usd: 0, loads: 6000 });
    assert.deepEqual(mapsPlan(50000), { id: 'maps-paid', usd: 140, loads: 30000 });
  });

  it('keeps CI constant and rejects unknown services', () => {
    assert.deepEqual(planFor('ci', 50000), { id: 'github-actions', usd: 33.05 });
    assert.deepEqual(planFor('email', 1000), { id: 'ses', usd: 0.2 });
    assert.throws(() => planFor('quantum', 1000), /Unknown service: quantum/);
  });

  it('estimates the peak load', () => {
    assert.deepEqual(peakLoad(3000), { requestsPerSecond: 1, vcpu: 0.03 });
    assert.deepEqual(peakLoad(50000), { requestsPerSecond: 16.67, vcpu: 0.5 });
  });
});

describe('bottlenecks', () => {
  it('lists the limits in the order they are crossed', () => {
    assert.deepEqual(LIMITS.map(limit => [limit.id, limit.upTo, limit.kind]), [
      ['expo-free', 1428, 'plan'],
      ['host-memory', 3000, 'plan'],
      ['ai-budget', 4000, 'config'],
      ['r2-writes', 16666, 'config'],
      ['maps-free', 16666, 'cost'],
      ['single-db-host', 20000, 'plan'],
      ['workers-free', 25000, 'plan'],
      ['cloudfront-free', 27777, 'plan'],
      ['single-app-host', 35000, 'plan'],
    ]);
  });

  it('names Expo Free as the first bottleneck', () => {
    assert.equal(firstBottleneck().id, 'expo-free');
  });

  it('returns the limits crossed at a scale', () => {
    assert.deepEqual(bottlenecks(1000), []);
    assert.deepEqual(bottlenecks(5000).map(limit => limit.id), ['expo-free', 'host-memory', 'ai-budget']);
    assert.equal(bottlenecks(50000).length, LIMITS.length);
  });
});

describe('projectionLabels', () => {
  it('names every service, plan, limit and kind in both languages', () => {
    for (const locale of ['es', 'en']) {
      const labels = projectionLabels(locale);
      for (const service of SERVICES) assert.ok(labels.services[service]);
      for (const users of [1000, 5000, 50000, 60000]) {
        for (const line of monthlyBreakdown(users).services) assert.ok(labels.plans[line.id], line.id);
      }
      for (const tiers of Object.values(TIERS)) for (const tier of tiers) assert.ok(labels.plans[tier.id], tier.id);
      for (const limit of LIMITS) {
        assert.ok(labels.limits[limit.id]);
        assert.ok(labels.kinds[limit.kind]);
      }
    }
  });

  it('formats the reach of a limit per locale', () => {
    assert.equal(projectionLabels('es').upTo(16666), 'hasta 16.666 usuarios');
    assert.equal(projectionLabels('en').upTo(16666), 'up to 16,666 users');
    assert.equal(projectionLabels('fr').title, 'Costs by scale');
  });
});
