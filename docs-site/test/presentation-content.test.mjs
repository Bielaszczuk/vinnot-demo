import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CHAPTERS, FACTS, RUBRIC, SLIDES, deckCopy, fill } from '../src/components/Presentation/content.mjs';
import { TIERS } from '../src/components/SealLadder/seals.mjs';

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs');
const ROWS = Object.values(RUBRIC).flat();
const LOCALES = ['es', 'en'];

/** Docusaurus route /docs/a/b → docs/<lang>/a/b.md(x) or docs/<lang>/a/b/README.md(x). */
const docExists = (route, language) => {
  const base = join(DOCS, language, route.replace(/^\/docs\/?/, ''));
  return ['.md', '.mdx', '/README.md', '/README.mdx'].some(suffix => existsSync(`${base}${suffix}`));
};

/** The nested key shape of a copy object, so both languages can be compared. */
const shape = value => {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shape(inner)]));
  }
  return typeof value;
};

/** Every string in a copy object. */
const strings = value => {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
};

describe('SLIDES', () => {
  it('gives every slide a unique id, a known chapter, a tone and at least one step', () => {
    assert.equal(new Set(SLIDES.map(slide => slide.id)).size, SLIDES.length);
    for (const slide of SLIDES) {
      assert.ok(CHAPTERS.includes(slide.chapter), slide.id);
      assert.ok(['paper', 'wine'].includes(slide.tone), slide.id);
      assert.ok(Number.isInteger(slide.steps) && slide.steps >= 1, slide.id);
    }
  });

  it('tells the story in order for people who do not know Vinnot', () => {
    const order = SLIDES.map(slide => CHAPTERS.indexOf(slide.chapter));
    assert.deepEqual(order, [...order].sort((a, b) => a - b));
    assert.deepEqual(CHAPTERS, ['intro', 'product', 'build', 'business', 'close']);
    assert.deepEqual(SLIDES.slice(0, 3).map(slide => slide.id), ['cover', 'agenda', 'problem']);
    assert.equal(SLIDES.at(-1).id, 'closing');
    assert.ok(SLIDES.findIndex(slide => slide.id === 'demo-plan') < SLIDES.findIndex(slide => slide.id === 'live'));
  });

  it('covers every rubric row and names only known rows', () => {
    const covered = new Set(SLIDES.flatMap(slide => slide.rubric));
    for (const row of ROWS) assert.ok(covered.has(row), `uncovered rubric row: ${row}`);
    for (const row of covered) assert.ok(ROWS.includes(row), `unknown rubric row: ${row}`);
  });

  it('points to documentation pages that exist in Spanish and in English', () => {
    for (const route of SLIDES.flatMap(slide => slide.docs)) {
      assert.match(route, /^\/docs(\/|$)/);
      for (const language of LOCALES) assert.ok(docExists(route, language), `${language}: ${route}`);
    }
  });
});

describe('deckCopy', () => {
  it('has the same texts in Spanish and in English, none empty', () => {
    const es = deckCopy('es');
    const en = deckCopy('en');
    assert.deepEqual(shape(en), shape(es));
    for (const text of [...strings(es), ...strings(en)]) assert.ok(text.trim().length > 0);
    assert.notEqual(es.slides.cover.kicker, en.slides.cover.kicker);
  });

  it('writes every slide, chapter, rubric row and documentation link', () => {
    for (const language of LOCALES) {
      const copy = deckCopy(language);
      for (const slide of SLIDES) {
        assert.ok(copy.slides[slide.id]?.title, `${language}: ${slide.id}`);
        for (const route of slide.docs) assert.ok(copy.docs[route], `${language}: ${route}`);
      }
      for (const chapter of CHAPTERS) assert.ok(copy.chapters[chapter], `${language}: ${chapter}`);
      for (const row of ROWS) assert.ok(copy.rubric.rows[row], `${language}: ${row}`);
      for (const block of Object.keys(RUBRIC)) assert.ok(copy.rubric.blocks[block], `${language}: ${block}`);
    }
  });

  it('falls back to Spanish for other languages', () => {
    assert.equal(deckCopy('fr'), deckCopy('es'));
  });
});

describe('fill', () => {
  it('puts numbers into sentences and leaves unknown placeholders visible', () => {
    assert.equal(fill('{web} web · {app} app', { web: 169, app: 193 }), '169 web · 193 app');
    assert.equal(fill('Slide {current} of {total}', { current: 2 }), 'Slide 2 of {total}');
  });
});

describe('FACTS', () => {
  it('adds up the requirements as the requirements index does', () => {
    const { requirements } = FACTS;
    assert.equal(requirements.web + requirements.app, requirements.functional);
    assert.deepEqual(
      [requirements.modules, requirements.useCases, requirements.functional, requirements.testCases, requirements.nonFunctional],
      [16, 117, 362, 497, 26],
    );
  });

  it('adds up the monthly cost to the documented total', () => {
    const total = FACTS.costs.items.reduce((sum, item) => sum + item.usd, 0);
    assert.equal(Math.round(total * 100) / 100, FACTS.costs.total);
    assert.equal(FACTS.costs.total, 83.31);
  });

  it('projects costs that grow with the users', () => {
    const usd = FACTS.scale.map(step => step.usd);
    assert.deepEqual(usd, [...usd].sort((a, b) => a - b));
    assert.deepEqual(FACTS.scale.map(step => step.users), [1000, 5000, 10000, 50000]);
  });

  it('charges the documented commission on a sample ticket', () => {
    const { ticket, rates } = FACTS.commission;
    assert.equal(ticket * rates[0] / 100, FACTS.commission.example);
    assert.deepEqual(rates, [3, 8, 12]);
  });

  it('places every schedule stage between January and October 2026', () => {
    for (const stage of FACTS.schedule.stages) {
      assert.ok(stage.from >= 1 && stage.to <= 10 && stage.from <= stage.to, stage.key);
    }
  });

  it('shows seals with the thresholds of the seal ladder', () => {
    const thresholds = Object.fromEntries(TIERS.map(tier => [tier.slug, tier.threshold]));
    for (const seal of FACTS.seals) assert.equal(seal.points, thresholds[seal.slug], seal.slug);
  });

  it('has one label per schedule stage, competitor decision and demo stop in both languages', () => {
    for (const language of LOCALES) {
      const copy = deckCopy(language);
      for (const stage of FACTS.schedule.stages) assert.ok(copy.slides.timeline.stages[stage.key], stage.key);
      for (const decision of FACTS.competitors.decisions) assert.ok(copy.slides.value.decisions[decision], decision);
      assert.equal(copy.slides['demo-plan'].stops.length, SLIDES.find(slide => slide.id === 'demo-plan').steps);
    }
  });
});
