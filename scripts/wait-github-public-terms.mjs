import { pathToFileURL } from 'node:url';

export function validTerms(document, locale) {
  return document?.locale === locale
    && typeof document.version === 'string' && document.version.length > 0
    && typeof document.acceptanceRevision === 'string' && document.acceptanceRevision.length > 0
    && /^[a-f0-9]{64}$/.test(document.contentHash ?? '')
    && typeof document.title === 'string' && document.title.length > 0
    && typeof document.summary === 'string' && document.summary.length > 0
    && Array.isArray(document.sections) && document.sections.length > 0
    && document.sections.every(section => ['id', 'title', 'body'].every(
      key => typeof section?.[key] === 'string' && section[key].length > 0,
    ));
}

export async function waitForPublicTerms({
  baseUrl,
  fetcher = fetch,
  pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
  attempts = 60,
  interval = 15000,
  log = console.log,
}) {
  if (!baseUrl || attempts < 1) throw new Error('API URL and positive attempt count are required');
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const documents = await Promise.all(['es', 'en'].map(async locale => {
        const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/legal/terms/current?locale=${locale}`, {
          signal: AbortSignal.timeout(10000),
          headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
        });
        if (!response.ok) throw new Error('Terms endpoint is not ready');
        const document = await response.json();
        if (!validTerms(document, locale)) throw new Error('Incomplete terms document');
        return document;
      }));
      if (documents[0].version !== documents[1].version
          || documents[0].acceptanceRevision !== documents[1].acceptanceRevision) {
        throw new Error('Terms translations are not aligned');
      }
      log(`Backend terms ready in ES/EN: ${documents[0].version}`);
      return;
    } catch {
      log(`Waiting for backend terms in ES/EN (${attempt}/${attempts})`);
    }
    if (attempt < attempts) await pause(interval);
  }
  throw new Error('Backend terms unavailable; frontend publication has not started. Retry after backend recovery.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await waitForPublicTerms({ baseUrl: process.env.VITE_API_BASE_URL });
}
