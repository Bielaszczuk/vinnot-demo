import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import chapterLabels, { labelCategories, localeOf } from '../src/sidebar/chapter-labels.mjs';

const category = (label, items = [], link) => ({ type: 'category', label, items, ...(link ? { link } : {}) });
const doc = id => ({ type: 'doc', id });

describe('localeOf', () => {
  it('reads the locale from translated doc sources and defaults to es', () => {
    assert.equal(localeOf([{ source: '@site/i18n/en/docusaurus-plugin-content-docs/current/a.md' }]), 'en');
    assert.equal(localeOf([{ source: '@site/../docs/es/a.md' }]), 'es');
    assert.equal(localeOf([{}]), 'es');
    assert.equal(localeOf([]), 'es');
  });
});

describe('labelCategories', () => {
  it('orders pages first, then known folders in book order, then unknown folders as given', () => {
    const items = [category('zeta'), category('backend'), doc('README'), category('getting-started'), category('alpha')];
    const labels = labelCategories(items, [], 'es').map(item => item.label ?? item.id);
    assert.deepEqual(labels, ['README', 'Backend', 'Primeros pasos', 'zeta', 'alpha']);
  });

  it('translates known folder names per locale and keeps unknown names', () => {
    const [es] = labelCategories([category('use-cases')], [], 'es');
    const [en] = labelCategories([category('use-cases')], [], 'en');
    const [other] = labelCategories([category('use-cases')], [], 'fr');
    assert.equal(es.label, 'Casos de uso');
    assert.equal(en.label, 'Use cases');
    assert.equal(other.label, 'use-cases');
  });

  it('prefers the title of the folder index page', () => {
    const items = [category('backend', [], { type: 'doc', id: 'backend/README' })];
    const [item] = labelCategories(items, [{ id: 'backend/README', title: 'Backend API' }], 'es');
    assert.equal(item.label, 'Backend API');
  });

  it('keys nested categories by their folder path so repeated names stay unique', () => {
    const items = [category('backend', [category('architecture')]), category('infra', [category('architecture')])];
    const [backend, infra] = labelCategories(items, [], 'en');
    assert.equal(backend.key, 'backend');
    assert.equal(backend.items[0].key, 'backend/architecture');
    assert.equal(infra.items[0].key, 'infra/architecture');
    assert.equal(infra.items[0].label, 'Architecture');
  });

  it('orders and keys folders with an index page by their folder name, not their title', () => {
    const titled = (folder, title) => category(title, [], { type: 'doc', id: `${folder}/README` });
    const items = [titled('governance', 'Gobierno'), titled('modules', 'Módulos'), category('backend'), titled('architecture', 'Arquitectura del sistema')];
    const docs = [
      { id: 'governance/README', title: 'Gobierno' },
      { id: 'modules/README', title: 'Módulos' },
      { id: 'architecture/README', title: 'Arquitectura del sistema' },
    ];
    const ordered = labelCategories(items, docs, 'es');
    assert.deepEqual(ordered.map(item => item.label), ['Módulos', 'Arquitectura del sistema', 'Backend', 'Gobierno']);
    assert.deepEqual(ordered.map(item => item.key), ['modules', 'architecture', 'backend', 'governance']);
  });

  it('ignores generated-index links when looking for a title', () => {
    const [item] = labelCategories([category('diagrams', [], { type: 'generated-index' })], [], 'en');
    assert.equal(item.label, 'Diagrams');
  });
});

describe('chapterLabels generator', () => {
  it('labels the default generated items for the locale of the docs', async () => {
    const docs = [{ id: 'a', source: '@site/i18n/en/docusaurus-plugin-content-docs/current/a.md' }];
    const items = await chapterLabels({
      docs,
      defaultSidebarItemsGenerator: async args => {
        assert.equal(args.docs, docs);
        assert.equal('defaultSidebarItemsGenerator' in args, false);
        return [category('testing')];
      },
    });
    assert.equal(items[0].label, 'Testing');
  });
});
