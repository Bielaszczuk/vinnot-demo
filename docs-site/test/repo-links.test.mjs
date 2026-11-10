import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import repoLinks, { docRoute, resolveLink } from '../src/remark/repo-links.mjs';

let repo;
let options;

before(() => {
  repo = mkdtempSync(join(tmpdir(), 'repo-links-'));
  for (const dir of ['docs/es/backend', 'docs/en/backend', 'site/i18n/en/current/backend', 'backend/src']) {
    mkdirSync(join(repo, dir), { recursive: true });
  }
  writeFileSync(join(repo, 'backend/src/Main.java'), 'class Main {}');
  writeFileSync(join(repo, 'backend/My File.java'), 'class MyFile {}');
  writeFileSync(join(repo, 'docs/en/backend/api.md'), '# API');
  writeFileSync(join(repo, 'docs/en/README.md'), '# Docs');
  options = {
    repoRoot: repo,
    repoUrl: 'https://github.com/acme/repo',
    branch: 'development',
    routeBasePath: 'docs',
    baseUrl: '/',
    locales: [
      { locale: 'es', docsDir: join(repo, 'docs/es'), prefix: '' },
      { locale: 'en', docsDir: join(repo, 'docs/en'), sourceDir: join(repo, 'site/i18n/en/current'), prefix: '/en' },
    ],
  };
});

after(() => rmSync(repo, { recursive: true, force: true }));

const esFile = () => join(repo, 'docs/es/backend/page.md');

describe('docRoute', () => {
  it('drops the extension and maps README or index to its folder', () => {
    assert.equal(docRoute('backend/api.md'), 'backend/api');
    assert.equal(docRoute('backend/README.md'), 'backend');
    assert.equal(docRoute('backend/index.mdx'), 'backend');
    assert.equal(docRoute('README.md'), '');
  });
});

describe('resolveLink', () => {
  it('keeps anchors, absolute paths and URLs with a scheme', () => {
    for (const url of ['', '#top', '/docs/x', 'https://example.com', 'mailto:a@b.c', 'pathname:///x']) {
      assert.equal(resolveLink(url, esFile(), options), url);
    }
  });

  it('keeps links between pages of the same language', () => {
    assert.equal(resolveLink('./other.md#part', esFile(), options), './other.md#part');
  });

  it('ignores files outside every docs folder', () => {
    assert.equal(resolveLink('../x.md', join(repo, 'backend/src/Main.java'), options), '../x.md');
  });

  it('rewrites a source file to its GitHub blob URL and keeps the anchor', () => {
    assert.equal(
      resolveLink('../../../backend/src/Main.java#L3', esFile(), options),
      'https://github.com/acme/repo/blob/development/backend/src/Main.java#L3',
    );
  });

  it('rewrites a folder to its GitHub tree URL and encodes spaces', () => {
    assert.equal(resolveLink('../../../backend/src', esFile(), options), 'https://github.com/acme/repo/tree/development/backend/src');
    assert.equal(
      resolveLink('../../../backend/My%20File.java', esFile(), options),
      'https://github.com/acme/repo/blob/development/backend/My%20File.java',
    );
  });

  it('keeps links to missing files and to paths outside the repository', () => {
    assert.equal(resolveLink('../../../backend/Missing.java', esFile(), options), '../../../backend/Missing.java');
    assert.equal(resolveLink('../../../../outside.txt', esFile(), options), '../../../../outside.txt');
  });

  it('links the other language mirror as a plain page load', () => {
    assert.equal(resolveLink('../../en/backend/api.md#auth', esFile(), options), 'pathname:///en/docs/backend/api#auth');
    assert.equal(resolveLink('../../en/README.md', esFile(), options), 'pathname:///en/docs/');
  });

  it('honours a non-root base URL', () => {
    const nested = { ...options, baseUrl: '/handbook/' };
    assert.equal(resolveLink('../../en/backend/api.md', esFile(), nested), 'pathname:///handbook/en/docs/backend/api');
  });

  it('resolves links of the synced English copy against the canonical docs/en folder', () => {
    const copy = join(repo, 'site/i18n/en/current/backend/page.md');
    assert.equal(
      resolveLink('../../../backend/src/Main.java', copy, options),
      'https://github.com/acme/repo/blob/development/backend/src/Main.java',
    );
    assert.equal(resolveLink('../../es/backend/page.md', copy, options), 'pathname:///docs/backend/page');
  });
});

describe('repoLinks plugin', () => {
  it('rewrites link and definition nodes and leaves other nodes alone', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'paragraph', children: [{ type: 'link', url: '../../../backend/src/Main.java', children: [] }] },
        { type: 'definition', url: '../../en/backend/api.md' },
        { type: 'image', url: '../../../backend/src/Main.java' },
        { type: 'link' },
      ],
    };
    repoLinks(options)(tree, { path: esFile() });
    assert.equal(tree.children[0].children[0].url, 'https://github.com/acme/repo/blob/development/backend/src/Main.java');
    assert.equal(tree.children[1].url, 'pathname:///en/docs/backend/api');
    assert.equal(tree.children[2].url, '../../../backend/src/Main.java');
    assert.equal(tree.children[3].url, undefined);
  });

  it('uses the file history when the path is not set and skips files without a path', () => {
    const tree = { type: 'root', children: [{ type: 'link', url: '../../../backend/src/Main.java' }] };
    repoLinks(options)(tree, { history: [esFile()] });
    assert.match(tree.children[0].url, /^https:\/\/github.com/);
    const untouched = { type: 'root', children: [{ type: 'link', url: '../x.md' }] };
    repoLinks(options)(untouched, {});
    assert.equal(untouched.children[0].url, '../x.md');
  });
});
