import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validTerms, waitForPublicTerms } from '../wait-github-public-terms.mjs';

const document = locale => ({ locale, version: 'v1', acceptanceRevision: 'r1',
  contentHash: 'a'.repeat(64), title: 'Terms', summary: 'Summary',
  sections: [{ id: 'scope', title: 'Scope', body: 'Content' }] });
const options = { baseUrl: 'https://api.example.test/api/', log: () => {}, interval: 0 };

test('validates complete documents, not just a successful HTTP response', () => {
  assert.equal(validTerms(document('es'), 'es'), true);
  for (const patch of [{ locale: 'en' }, { version: '' }, { acceptanceRevision: '' },
    { contentHash: 'wrong' }, { title: '' }, { summary: '' }, { sections: [] },
    { sections: [{ id: 'one' }] }, { sections: null }]) {
    assert.equal(validTerms({ ...document('es'), ...patch }, 'es'), false);
  }
  assert.equal(validTerms(null, 'es'), false);
});

test('waits for backend recovery and checks both locales without sending credentials', async () => {
  let requests = 0;
  let pauses = 0;
  await waitForPublicTerms({ ...options, attempts: 2,
    pause: async () => { pauses++; },
    fetcher: async (url, init) => {
      requests++;
      assert.equal(init.headers.Authorization, undefined);
      assert.ok(init.signal instanceof AbortSignal);
      assert.equal(new URL(url).pathname, '/api/legal/terms/current');
      return { ok: requests > 2, json: async () => document(new URL(url).searchParams.get('locale')) };
    },
  });
  assert.equal(requests, 4);
  assert.equal(pauses, 1);
});

test('fails closed for malformed JSON, missing documents, timeout and mismatched revisions', async () => {
  for (const fetcher of [
    async () => { throw new Error('timeout'); },
    async () => ({ ok: true, json: async () => { throw new Error('HTML'); } }),
    async () => ({ ok: true, json: async () => ({}) }),
    async url => ({ ok: true, json: async () => ({ ...document(new URL(url).searchParams.get('locale')), version: url.endsWith('es') ? 'v1' : 'v2' }) }),
    async url => ({ ok: true, json: async () => ({ ...document(new URL(url).searchParams.get('locale')), acceptanceRevision: url.endsWith('es') ? 'r1' : 'r2' }) }),
  ]) {
    await assert.rejects(waitForPublicTerms({ ...options, attempts: 1, fetcher,
      pause: async () => assert.fail('No sleep after last attempt'),
    }), /publication has not started/);
  }
  await assert.rejects(waitForPublicTerms({ ...options, baseUrl: '' }), /API URL/);
});

test('deployment checks backend readiness before any frontend upload', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/deploy-frontend-dev.yml', import.meta.url), 'utf8');
  const gate = workflow.indexOf('node ../scripts/wait-github-public-terms.mjs');
  assert.ok(gate > 0);
  assert.ok(gate < workflow.indexOf('publish-web-release.mjs'));
});
