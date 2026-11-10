import { test as base, expect, type Page } from '@playwright/test'
export { expect }
// Every browser scenario starts anonymous with a controlled local API.
// Individual scenarios register more specific routes after this default.
export const test = base.extend({
  page: async ({ page }, runScenario) => {
    await page.addInitScript(() => localStorage.setItem('vinnot-logout-pending', '1'))
    await page.route(/^https?:\/\/[^/]+\/api\//, route => route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED' } }))
    await page.route(/https:\/\/(?:maps\.googleapis\.com|maps\.gstatic\.com)\//, route => route.abort())
    await runScenario(page)
  },
})
export const qaUser = { id: '00000000-0000-0000-0000-000000000165', username: 'localqa', name: 'Local QA', email: 'qa@example.org', roles: ['ROLE_USER'], emailVerified: true, onboardingCompleted: true }
export const emptyPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }
export async function authenticatedApi(page: Page, requests: URL[]) {
  await page.addInitScript(() => localStorage.removeItem('vinnot-logout-pending'))
  await page.route(/^https?:\/\/[^/]+\/api\//, route => {
    const url = new URL(route.request().url()); requests.push(url)
    const path = url.pathname
    const json = (body: unknown) => route.fulfill({ status: 200, json: body })
    if (path.endsWith('/auth/web/refresh') || path.endsWith('/auth/web/login')) return json({ accessToken: 'local-controlled-access', tokenType: 'Bearer', expiresIn: 60000, user: qaUser })
    if (path.endsWith('/auth/me')) return json(qaUser)
    if (path.endsWith('/legal/acceptance')) return json({ required: false, acceptedAt: '2026-01-01T00:00:00Z', document: { version: 'qa', acceptanceRevision: 'qa', locale: 'es', contentHash: 'a'.repeat(64), title: 'Terms', summary: 'QA', sections: [{ id: 'one', title: 'Section', body: 'Controlled content' }] } })
    if (path.endsWith('/countries')) return json([{ id: 'ar', code: 'AR', name: 'Argentina' }, { id: 'fr', code: 'FR', name: 'France' }])
    if (path.endsWith('/regions') || path.endsWith('/grape-types')) return json([])
    if (path.endsWith('/events/discovery')) return json({ radiusKm: 100, nearbyEventsFound: false, nearbyEvents: emptyPage, otherEvents: emptyPage })
    return json(emptyPage)
  })
}
