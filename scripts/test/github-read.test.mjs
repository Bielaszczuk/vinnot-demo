import assert from 'node:assert/strict';
import { test } from 'node:test';
import { githubRead } from '../github-read.mjs';

test('read retries a socket closure without retrying denied access or bad JSON', async () => {
  const sleeps = [], calls = [];
  const result = await githubRead('https://api.github.com/repos/o/r', { token: 'fixture', sleep: async ms => sleeps.push(ms),
    fetcher: async (url, options) => {
      calls.push([url, options]);
      if (calls.length === 1) throw new TypeError('fetch failed', { cause: { code: 'UND_ERR_SOCKET' } });
      if (calls.length === 2) return new Response('', { status: 503 });
      return Response.json({ success: true });
    } });
  assert.equal(result.success, true);
  assert.deepEqual(sleeps, [500, 1000]);
  assert.equal(calls.length, 3);
  assert.equal(calls[0][1].method, undefined); // GET only.
  assert.equal(calls[0][1].headers.Authorization, 'Bearer fixture');
  for (const status of [401, 403, 404, 500]) {
    let count = 0;
    await assert.rejects(githubRead('fixture', { fetcher: async () => { count++; return new Response('', { status }); } }), /HTTP/);
    assert.equal(count, 1);
  }
  await assert.rejects(githubRead('fixture', { fetcher: async () => new Response('not-json') }), SyntaxError);
  await assert.rejects(githubRead('fixture', { fetcher: async () => { throw new Error('programming error'); } }), /programming/);
});

test('transient reads stop after three attempts and timeouts use the same bound', async () => {
  for (const status of [429, 502, 503, 504, 'network', 'timeout', 'abort']) {
    let calls = 0;
    await assert.rejects(githubRead('fixture', { sleep: async () => {}, fetcher: async () => {
      calls++;
      if (status === 'network') throw new TypeError('closed');
      if (status === 'timeout' || status === 'abort') throw new DOMException('cancelled', status === 'timeout' ? 'TimeoutError' : 'AbortError');
      return new Response('', { status });
    } }));
    assert.equal(calls, 3);
  }
});
