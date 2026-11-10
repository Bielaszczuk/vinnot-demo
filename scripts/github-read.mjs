/** Retry only idempotent reads on transient transport/service failures. Never retry a write. */
export async function githubRead(url, { token, fetcher = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try {
      response = await fetcher(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      if (attempt === 2 || !(error instanceof TypeError || ['TimeoutError', 'AbortError'].includes(error.name))) throw error;
    }
    if (response?.ok) return response.json();
    if (response && ![429, 502, 503, 504].includes(response.status)) throw new Error(`GitHub read failed: HTTP ${response.status}`);
    if (attempt === 2) throw new Error(`GitHub read failed after bounded retries: HTTP ${response.status}`);
    await sleep(500 * (attempt + 1));
  }
}
