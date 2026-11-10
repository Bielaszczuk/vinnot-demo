import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import tableScroll from '../src/rehype/table-scroll.mjs';

const table = (cells = []) => ({ type: 'element', tagName: 'table', properties: {}, children: cells });
const element = (tagName, children = []) => ({ type: 'element', tagName, properties: {}, children });
const run = tree => {
  tableScroll()(tree);
  return tree;
};

describe('table-scroll rehype plugin', () => {
  it('wraps every table in a horizontally scrollable container', () => {
    const inner = table([element('tbody')]);
    const tree = run({ type: 'root', children: [element('p'), inner] });

    assert.equal(tree.children[0].tagName, 'p');
    assert.deepEqual(tree.children[1], {
      type: 'element',
      tagName: 'div',
      properties: { className: ['table-scroll'] },
      children: [inner],
    });
  });

  it('wraps tables nested in other elements', () => {
    const tree = run({ type: 'root', children: [element('section', [table()])] });

    const wrapper = tree.children[0].children[0];
    assert.equal(wrapper.tagName, 'div');
    assert.equal(wrapper.children[0].tagName, 'table');
  });

  it('leaves trees without tables and leaf nodes untouched', () => {
    const tree = run({ type: 'root', children: [element('p', [{ type: 'text', value: 'plain' }])] });

    assert.deepEqual(tree, { type: 'root', children: [element('p', [{ type: 'text', value: 'plain' }])] });
  });
});
