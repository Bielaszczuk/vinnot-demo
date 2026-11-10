import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  TIERS,
  formatPoints,
  ladderLabels,
  particlesFor,
  sealSlug,
  sparksFor,
  tiltFrom,
} from '../src/components/SealLadder/seals.mjs';

describe('TIERS', () => {
  it('lists the eleven seals with their keys and thresholds in order', () => {
    assert.deepEqual(
      TIERS.map(tier => [tier.key, tier.threshold]),
      [
        ['BROTE', 0],
        ['PARRA', 30],
        ['RACIMO', 80],
        ['VENDIMIA', 160],
        ['LAGAR', 280],
        ['BARRICA', 450],
        ['CRIANZA', 700],
        ['RESERVA', 1000],
        ['GRAN_RESERVA', 1600],
        ['GRAN_ENOFILO', 2600],
        ['VINNOT', 5000],
      ],
    );
  });

  it('names every seal in Spanish and in English', () => {
    const es = ladderLabels('es');
    const en = ladderLabels('en');
    assert.deepEqual(TIERS.map(tier => es.names[tier.key]), [
      'Brote', 'Parra', 'Racimo', 'Vendimia', 'Lagar', 'Barrica',
      'Crianza', 'Reserva', 'Gran Reserva', 'Gran Enófilo', 'Vinnot',
    ]);
    assert.deepEqual(TIERS.map(tier => en.names[tier.key]), [
      'Bud', 'Vine Leaf', 'Cluster', 'Harvest', 'Wine Press', 'Barrel',
      'Aging', 'Reserve', 'Grand Reserve', 'Connoisseur', 'Vinnot',
    ]);
    assert.equal(en.seal(en.names.PARRA), 'Vine Leaf seal');
    assert.equal(es.seal(es.names.VINNOT), 'Sello Vinnot');
  });

  it('derives each art slug from the key', () => {
    assert.equal(sealSlug('GRAN_RESERVA'), 'gran-reserva');
    assert.equal(sealSlug('VINNOT'), 'vinnot');
    assert.deepEqual(TIERS.map(tier => tier.slug), TIERS.map(tier => sealSlug(tier.key)));
  });
});

describe('sparksFor', () => {
  it('gives the higher seals their sparkles, coloured per seal', () => {
    assert.deepEqual(sparksFor('brote', 112), []);
    const vendimia = sparksFor('vendimia', 112);
    assert.deepEqual(vendimia, [{ x: 70, y: 32, z: 16, delay: 0.9, duration: 3.8, color: '#fff8e0' }]);
    const granReserva = sparksFor('gran-reserva', 112);
    assert.equal(granReserva.length, 3);
    assert.deepEqual(granReserva.map(spark => spark.duration), [2.4, 2.9, 3.4]);
    assert.ok(granReserva.every(spark => spark.color === '#ffe39a'));
    assert.equal(sparksFor('gran-enofilo', 112).length, 5);
    const vinnot = sparksFor('vinnot', 112);
    assert.equal(vinnot.length, 6);
    assert.deepEqual(vinnot.map(spark => spark.color), ['#ff7ad1', '#ffd27a', '#8affc1', '#79d3ff', '#b78bff', '#ff7ad1']);
  });

  it('skips sparkles below 40 px, where they read as noise', () => {
    assert.deepEqual(sparksFor('vinnot', 39), []);
    assert.equal(sparksFor('vinnot', 40).length, 6);
  });

  it('returns nothing for an unknown seal', () => {
    assert.deepEqual(sparksFor('sommelier', 112), []);
  });
});

describe('particlesFor', () => {
  it('raises nine particles only from Vinnot, the same on every render', () => {
    const first = particlesFor('vinnot', 112);
    assert.equal(first.length, 9);
    assert.deepEqual(particlesFor('vinnot', 112), first);
    assert.deepEqual(first.map(particle => particle.delay), [0, 0.45, 0.9, 1.35, 1.8, 2.25, 2.7, 3.15, 3.6]);
    for (const particle of first) {
      assert.ok(particle.x >= 22 && particle.x <= 78);
      assert.ok(particle.y >= 70 && particle.y <= 88);
      assert.ok(particle.z >= 2.5 && particle.z <= 5);
      assert.ok(particle.duration >= 2.8 && particle.duration <= 4.4);
      assert.ok(particle.rise >= Math.floor(112 * 0.45) && particle.rise <= Math.ceil(112 * 0.8));
      assert.ok(Math.abs(particle.dx) <= Math.ceil(112 * 0.125));
    }
    assert.deepEqual(particlesFor('gran-enofilo', 112), []);
    assert.deepEqual(particlesFor('vinnot', 28), []);
  });
});

describe('tiltFrom', () => {
  it('turns the pointer position into tilt and foil properties', () => {
    assert.deepEqual(tiltFrom(0.5, 0.5, 12), { rx: '0.0deg', ry: '0.0deg', mx: '50%', my: '50%', ang: '90deg' });
    assert.deepEqual(tiltFrom(1, 0, 12), { rx: '6.0deg', ry: '6.0deg', mx: '100%', my: '0%', ang: '130deg' });
    assert.deepEqual(tiltFrom(0, 1, 18), { rx: '-9.0deg', ry: '-9.0deg', mx: '0%', my: '100%', ang: '50deg' });
  });
});

describe('formatPoints and ladderLabels', () => {
  it('writes thresholds with the locale grouping', () => {
    assert.equal(formatPoints(5000, 'en'), '5,000');
    assert.equal(formatPoints(30, 'es'), '30');
  });

  it('labels the ladder in Spanish by default and in English for en', () => {
    const es = ladderLabels('es');
    const en = ladderLabels('en');
    assert.equal(es.from(TIERS[1]), 'Desde 30 puntos');
    assert.equal(en.from(TIERS[10]), 'From 5,000 points');
    assert.equal(es.seal('Brote'), 'Sello Brote');
    assert.equal(en.seal('Brote'), 'Brote seal');
    assert.equal(ladderLabels('fr').pause, es.pause);
    for (const tier of TIERS) {
      assert.ok(es.shine[tier.slug], `es shine for ${tier.slug}`);
      assert.ok(en.shine[tier.slug], `en shine for ${tier.slug}`);
    }
  });
});
