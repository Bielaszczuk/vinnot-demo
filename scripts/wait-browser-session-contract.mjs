import { pathToFileURL } from 'node:url';

export async function waitBrowserSessionContract({ baseUrl, origin, attempts = 60, fetcher = fetch,
  pause = ms => new Promise(resolve => setTimeout(resolve, ms)), log = console.log }) {
  if (!baseUrl || !origin || attempts < 1) throw new Error('API URL, frontend origin and attempts are required');
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/auth/web/refresh`, {
        method: 'POST', headers: { Origin: origin, 'X-Vinnot-Web-Session': '1', Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (response.status === 204 && (await response.text()) === ''
          && response.headers.get('cache-control')?.includes('no-store')
          && !response.headers.get('set-cookie')
          && response.headers.get('access-control-allow-origin') === origin
          && response.headers.get('access-control-allow-credentials') === 'true') return;
    } catch { /* A deploying backend may be temporarily unavailable. */ }
    log(`Waiting for protected browser-session contract (${attempt}/${attempts})`);
    if (attempt < attempts) await pause(15000);
  }
  throw new Error('Browser-session backend not ready; frontend publication must not proceed');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await waitBrowserSessionContract({ baseUrl: process.env.VITE_API_BASE_URL, origin: process.env.PUBLIC_URL });
}
