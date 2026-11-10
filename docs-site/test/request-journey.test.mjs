import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  KINDS,
  SCENARIO_IDS,
  clampStep,
  hopAt,
  isLastStep,
  labelsFor,
  nextStep,
  normalizeLocale,
  previousStep,
  progress,
  scenarioById,
  scenariosFor,
} from '../src/components/RequestJourney/journey.mjs';

describe('normalizeLocale', () => {
  it('maps any English locale to en and everything else to es', () => {
    assert.equal(normalizeLocale('en'), 'en');
    assert.equal(normalizeLocale('en-US'), 'en');
    assert.equal(normalizeLocale('EN'), 'en');
    assert.equal(normalizeLocale('es'), 'es');
    assert.equal(normalizeLocale('pt-BR'), 'es');
    assert.equal(normalizeLocale(undefined), 'es');
  });
});

describe('scenariosFor', () => {
  it('lists the five scenarios in picker order with their Spanish titles', () => {
    const scenarios = scenariosFor('es');
    assert.deepEqual(
      scenarios.map(scenario => scenario.id),
      SCENARIO_IDS,
    );
    assert.deepEqual(
      scenarios.map(scenario => scenario.title),
      [
        'Abrir vinnot.com',
        'La app pide /api/wines',
        'Ver una imagen',
        'Pago con Mercado Pago (webhook)',
        'Actualización OTA',
      ],
    );
  });

  it('resolves English texts for the English locale', () => {
    const [web] = scenariosFor('en');
    assert.equal(web.title, 'Open vinnot.com');
    assert.match(web.summary, /CloudFront/);
    assert.equal(web.hops[0].name, 'Browser');
  });

  it('gives every hop an index, a known kind and non-empty texts in both languages', () => {
    for (const locale of ['es', 'en']) {
      for (const scenario of scenariosFor(locale)) {
        assert.ok(scenario.hops.length >= 4, `${scenario.id} has at least four hops`);
        assert.ok(scenario.summary.length > 20);
        scenario.hops.forEach((hop, index) => {
          assert.equal(hop.index, index);
          assert.ok(KINDS.includes(hop.kind), `${hop.kind} is a known kind`);
          assert.ok(hop.name.length > 0);
          assert.ok(hop.detail.length > 20);
        });
      }
    }
  });

  it('keeps the same hops in both languages', () => {
    const es = scenariosFor('es');
    const en = scenariosFor('en');
    es.forEach((scenario, index) => {
      assert.deepEqual(
        scenario.hops.map(hop => hop.kind),
        en[index].hops.map(hop => hop.kind),
      );
    });
  });

  it('describes the TLS, WAF, rate limit, JWT and query hops of the request path', () => {
    const [web, api] = scenariosFor('es');
    assert.match(web.hops[2].detail, /TLS/);
    assert.match(web.hops[3].detail, /reputación IP/);
    assert.match(api.hops[2].detail, /ACME/);
    assert.match(api.hops[3].detail, /429/);
    assert.match(api.hops[4].detail, /firma y vencimiento/);
    assert.equal(api.hops.at(-1).kind, 'data');
  });
});

describe('labelsFor', () => {
  it('returns Spanish and English interface labels', () => {
    assert.equal(labelsFor('es').play, 'Reproducir');
    assert.equal(labelsFor('es').step(2, 7), 'Paso 2 de 7');
    assert.equal(labelsFor('en').pause, 'Pause');
    assert.equal(labelsFor('en').step(1, 5), 'Step 1 of 5');
    assert.match(labelsFor('en').reducedMotion, /reduced motion/);
  });
});

describe('scenarioById', () => {
  const scenarios = scenariosFor('es');

  it('finds a scenario by id', () => {
    assert.equal(scenarioById(scenarios, 'ota').title, 'Actualización OTA');
  });

  it('falls back to the first scenario for an unknown id', () => {
    assert.equal(scenarioById(scenarios, 'missing').id, 'open-web');
  });
});

describe('clampStep', () => {
  it('keeps steps inside the hops and drops fractions', () => {
    assert.equal(clampStep(-3, 5), 0);
    assert.equal(clampStep(2.9, 5), 2);
    assert.equal(clampStep(9, 5), 4);
  });

  it('returns 0 for non-numbers and empty scenarios', () => {
    assert.equal(clampStep(Number.NaN, 5), 0);
    assert.equal(clampStep(Number.POSITIVE_INFINITY, 5), 0);
    assert.equal(clampStep(3, 0), 0);
  });
});

describe('hopAt', () => {
  it('returns the clamped hop of a scenario', () => {
    const scenario = scenarioById(scenariosFor('en'), 'image');
    assert.equal(hopAt(scenario, 0).name, 'Web or app');
    assert.equal(hopAt(scenario, 99).name, 'Private R2');
  });
});

describe('nextStep and previousStep', () => {
  it('move one hop and stop at both ends', () => {
    assert.equal(nextStep(0, 3), 1);
    assert.equal(nextStep(2, 3), 2);
    assert.equal(previousStep(2, 3), 1);
    assert.equal(previousStep(0, 3), 0);
  });
});

describe('isLastStep', () => {
  it('is true only on the last hop', () => {
    assert.equal(isLastStep(3, 4), true);
    assert.equal(isLastStep(9, 4), true);
    assert.equal(isLastStep(1, 4), false);
    assert.equal(isLastStep(0, 0), true);
  });
});

describe('progress', () => {
  it('spreads the hops from 0 to 100 percent', () => {
    assert.equal(progress(0, 5), 0);
    assert.equal(progress(2, 5), 50);
    assert.equal(progress(4, 5), 100);
    assert.equal(progress(7, 5), 100);
  });

  it('keeps a single hop at the start', () => {
    assert.equal(progress(0, 1), 0);
    assert.equal(progress(0, 0), 0);
  });
});
