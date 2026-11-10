import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  LAYER_KEYS,
  labelsFor,
  layerForKey,
  layersFor,
  nextLayer,
  statusCounts,
} from '../src/components/DefenseLayers/layers.mjs';

describe('LAYER_KEYS', () => {
  it('lists the six layers from the edge to the core', () => {
    assert.deepEqual(LAYER_KEYS, ['edge', 'transport', 'http', 'application', 'data', 'supply']);
  });
});

describe('layersFor', () => {
  it('returns Spanish titles, summaries and control labels for es', () => {
    const [edge] = layersFor('es');
    assert.equal(edge.key, 'edge');
    assert.equal(edge.title, 'Borde y red');
    assert.match(edge.summary, /request/);
    assert.deepEqual(edge.controls[0], {
      key: 'waf-web',
      status: 'implemented',
      label: 'AWS WAF con reglas administradas delante de la web',
    });
  });

  it('returns English text for en', () => {
    const application = layersFor('en').find(layer => layer.key === 'application');
    assert.equal(application?.title, 'Application');
    assert.equal(application?.controls.find(control => control.key === 'bcrypt')?.label, 'Passwords hashed with BCrypt (cost 10)');
  });

  it('falls back to Spanish for any other locale', () => {
    assert.deepEqual(layersFor('fr'), layersFor('es'));
  });

  it('keeps the same layers and controls in both languages', () => {
    const shape = locale => layersFor(locale).map(layer => [layer.key, layer.controls.map(c => [c.key, c.status])]);
    assert.deepEqual(shape('en'), shape('es'));
  });

  it('gives every control a known status and a unique key within its layer', () => {
    for (const layer of layersFor('en')) {
      const keys = layer.controls.map(control => control.key);
      assert.equal(new Set(keys).size, keys.length, layer.key);
      for (const control of layer.controls) {
        assert.ok(['implemented', 'mitigated', 'accepted', 'pending'].includes(control.status), control.key);
      }
    }
  });

  const keysWith = status =>
    layersFor('en').flatMap(layer => layer.controls.filter(c => c.status === status).map(c => c.key));

  it('marks the open gaps of known-limitations.md as pending', () => {
    assert.deepEqual(keysWith('pending'), [
      'pinning',
      'csp-styles',
      'field-encryption',
      'export',
      'oidc-dev',
      'ota-signing',
      'audit-view',
    ]);
  });

  it('marks the controls that wait for the owner to apply them as mitigated', () => {
    assert.deepEqual(keysWith('mitigated'), ['waf-api', 'origin-cloudflare', 'iac']);
  });

  it('marks the per-instance rate-limit counters as an accepted decision', () => {
    assert.deepEqual(keysWith('accepted'), ['instance-limits']);
  });

  it('marks the controls resolved on 2026-10-30 as implemented', () => {
    const implemented = keysWith('implemented');
    for (const key of ['trusted-proxies', 'lockout', 'timing', 'refresh-reuse', 'security-events']) {
      assert.ok(implemented.includes(key), key);
    }
  });
});

describe('statusCounts', () => {
  it('counts implemented and pending controls', () => {
    const counts = statusCounts([
      { controls: [{ status: 'implemented' }, { status: 'pending' }, { status: 'mitigated' }] },
      { controls: [{ status: 'implemented' }, { status: 'accepted' }] },
    ]);
    assert.deepEqual(counts, { implemented: 2, mitigated: 1, accepted: 1, pending: 1, total: 5 });
  });

  it('returns zeros without layers', () => {
    assert.deepEqual(statusCounts([]), { implemented: 0, mitigated: 0, accepted: 0, pending: 0, total: 0 });
  });

  it('adds up every control of the real layers', () => {
    const layers = layersFor('es');
    const counts = statusCounts(layers);
    assert.equal(counts.total, layers.reduce((sum, layer) => sum + layer.controls.length, 0));
    assert.equal(counts.pending, 7);
    assert.equal(counts.mitigated, 3);
    assert.equal(counts.accepted, 1);
    assert.equal(counts.implemented + counts.mitigated + counts.accepted + counts.pending, counts.total);
  });
});

describe('nextLayer', () => {
  it('moves inward one layer at a time', () => {
    assert.equal(nextLayer(0, 6), 1);
    assert.equal(nextLayer(4, 6), 5);
  });

  it('starts again at the edge after the core', () => {
    assert.equal(nextLayer(5, 6), 0);
  });

  it('stays at the first layer when there are none', () => {
    assert.equal(nextLayer(3, 0), 0);
  });
});

describe('layerForKey', () => {
  it('moves to the next layer with ArrowDown and ArrowRight, wrapping at the end', () => {
    assert.equal(layerForKey('ArrowDown', 1, 6), 2);
    assert.equal(layerForKey('ArrowRight', 5, 6), 0);
  });

  it('moves to the previous layer with ArrowUp and ArrowLeft, wrapping at the start', () => {
    assert.equal(layerForKey('ArrowUp', 2, 6), 1);
    assert.equal(layerForKey('ArrowLeft', 0, 6), 5);
  });

  it('jumps to the first and last layers with Home and End', () => {
    assert.equal(layerForKey('Home', 4, 6), 0);
    assert.equal(layerForKey('End', 1, 6), 5);
  });

  it('ignores keys that do not navigate', () => {
    assert.equal(layerForKey('Enter', 2, 6), null);
  });

  it('returns null when there are no layers', () => {
    assert.equal(layerForKey('ArrowDown', 0, 0), null);
  });
});

describe('labelsFor', () => {
  it('formats the Spanish summary, position and statuses', () => {
    const labels = labelsFor('es');
    assert.equal(
      labels.summary({ implemented: 39, mitigated: 3, accepted: 1, pending: 7 }),
      'Implementados: 39 · Mitigados: 3 · Decisiones aceptadas: 1 · Pendientes: 7',
    );
    assert.equal(labels.layerPosition(2, 6), 'Capa 2 de 6');
    assert.deepEqual(labels.status, {
      implemented: 'Implementado',
      mitigated: 'Mitigado',
      accepted: 'Decisión aceptada',
      pending: 'Pendiente',
    });
    assert.equal(labels.pause, 'Pausar el recorrido');
  });

  it('formats the English summary and position', () => {
    const labels = labelsFor('en');
    assert.equal(
      labels.summary({ implemented: 39, mitigated: 3, accepted: 1, pending: 7 }),
      'Implemented: 39 · Mitigated: 3 · Accepted decisions: 1 · Pending: 7',
    );
    assert.equal(labels.status.mitigated, 'Mitigated');
    assert.equal(labels.status.accepted, 'Accepted decision');
    assert.equal(labels.layerPosition(6, 6), 'Layer 6 of 6');
    assert.equal(labels.play, 'Resume the journey');
  });

  it('falls back to Spanish for any other locale', () => {
    assert.equal(labelsFor('pt'), labelsFor('es'));
  });
});
