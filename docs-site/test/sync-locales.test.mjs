import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { localeTargets, syncAll, syncLocale } from '../scripts/sync-locales.mjs';

const script = fileURLToPath(new URL('../scripts/sync-locales.mjs', import.meta.url));
let root;

before(() => {
  root = mkdtempSync(join(tmpdir(), 'sync-locales-'));
  mkdirSync(join(root, 'docs/en/backend'), { recursive: true });
  mkdirSync(join(root, 'site'));
  writeFileSync(join(root, 'docs/en/backend/api.md'), '# API');
});

after(() => rmSync(root, { recursive: true, force: true }));

describe('localeTargets', () => {
  it('maps docs/en to the Docusaurus translated docs folder', () => {
    const { en } = localeTargets(join(root, 'site'));
    assert.equal(en.source, join(root, 'docs/en'));
    assert.equal(en.target, join(root, 'site/i18n/en/docusaurus-plugin-content-docs/current'));
  });
});

describe('syncLocale', () => {
  it('copies the mirror and removes files that no longer exist in it', () => {
    const { en } = localeTargets(join(root, 'site'));
    mkdirSync(en.target, { recursive: true });
    writeFileSync(join(en.target, 'stale.md'), '# Stale');
    assert.equal(syncLocale(en), en.target);
    assert.equal(readFileSync(join(en.target, 'backend/api.md'), 'utf8'), '# API');
    assert.equal(existsSync(join(en.target, 'stale.md')), false);
  });

  it('fails when the mirror is missing', () => {
    assert.throws(
      () => syncLocale({ source: join(root, 'missing'), target: join(root, 'out') }),
      /Missing locale source/,
    );
  });
});

describe('syncAll', () => {
  it('syncs every configured locale for a site folder', () => {
    const targets = syncAll(join(root, 'site'));
    assert.deepEqual(targets, [join(root, 'site/i18n/en/docusaurus-plugin-content-docs/current')]);
  });
});

describe('command line', () => {
  it('syncs the site folder given as argument and reports it', () => {
    const target = join(root, 'site/i18n/en/docusaurus-plugin-content-docs/current');
    rmSync(target, { recursive: true, force: true });
    const output = execFileSync(process.execPath, [script, join(root, 'site')], { encoding: 'utf8' });
    assert.equal(output, `Synced ${target}\n`);
    assert.equal(readFileSync(join(target, 'backend/api.md'), 'utf8'), '# API');
  });
});
