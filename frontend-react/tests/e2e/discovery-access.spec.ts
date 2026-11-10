import { test, expect, authenticatedApi, qaUser, emptyPage } from './fixtures'

test('guests cannot query product routes; login preserves the URL and filter', async ({ page }) => {
  const requests: URL[] = []
  await page.route(/^https?:\/\/[^/]+\/api\//, route => {
    const url = new URL(route.request().url()); requests.push(url)
    if (url.pathname.endsWith('/auth/web/login')) return route.fulfill({ json: { accessToken: 'local-access', expiresIn: 60000, user: qaUser } })
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: qaUser })
    if (url.pathname.endsWith('/legal/acceptance')) return route.fulfill({ json: { required: false, acceptedAt: '2026-01-01T00:00:00Z', document: { version: 'qa', acceptanceRevision: 'qa', locale: 'es', contentHash: 'a'.repeat(64), title: 'Terms', summary: 'QA', sections: [{ id: 'one', title: 'Section', body: 'Controlled content' }] } } })
    if (url.pathname.endsWith('/countries')) return route.fulfill({ json: [{ id: 'fr', code: 'FR', name: 'France' }] })
    if (url.pathname.endsWith('/regions') || url.pathname.endsWith('/grape-types')) return route.fulfill({ json: [] })
    return route.fulfill({ json: emptyPage })
  })
  await page.goto('/wines?country=France#catalog')
  await expect(page).toHaveURL(/\/login\?returnUrl=/)
  expect(requests.some(url => /\/(wines|regions|events)$/.test(url.pathname))).toBe(false)
  await page.getByLabel('Correo').fill('qa@example.org')
  await page.getByLabel('Contraseña', { exact: true }).fill('LocalPassword165!')
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  await expect(page).toHaveURL(/\/wines\?country=France#catalog$/)
  await expect(page.getByLabel('País', { exact: true })).toHaveValue('France')
  await expect.poll(() => requests.some(url => url.pathname.endsWith('/wines') && url.searchParams.get('country') === 'France')).toBe(true)
})

test('new footer navigation starts at the top and legal anchors clear the header', async ({ page }) => {
  await page.goto('/help')
  await page.locator('footer').getByRole('link', { name: 'Contacto', exact: true }).click()
  await expect(page).toHaveURL(/\/contact$/)
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  await page.goto('/privacy')
  await expect(page.locator('article section').last()).toBeVisible()
  const links = page.locator('article nav a[href*="#"]')
  const fallbackLinks = page.locator('article aside a[href*="#"]')
  const anchor = await links.count() ? links.last() : fallbackLinks.last()
  await anchor.click()
  const target = page.locator('article section').last()
  await expect.poll(async () => (await target.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(56)
})

test('automatic country reaches the API and can be removed without returning', async ({ page }) => {
  const requests: URL[] = []
  await authenticatedApi(page, requests)
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: (success: PositionCallback) => success({ coords: { latitude: 0, longitude: 0 } } as GeolocationPosition) } })
    Object.assign(window, { google: { maps: { Geocoder: class { geocode(_request: unknown, callback: (results: unknown[], status: string) => void) { callback([{ formatted_address: 'Argentina', address_components: [{ long_name: 'Argentina', short_name: 'AR', types: ['country'] }] }], 'OK') } } } } })
  })
  await page.goto('/wines')
  await expect(page.getByLabel('País', { exact: true })).toHaveValue('Argentina')
  await expect.poll(() => requests.some(url => url.pathname.endsWith('/wines') && url.searchParams.get('country') === 'Argentina')).toBe(true)
  expect(requests.filter(url => url.pathname.endsWith('/wines')).every(url => url.searchParams.get('country') === 'Argentina')).toBe(true)
  await page.getByLabel('País', { exact: true }).selectOption('')
  await expect.poll(() => requests.some(url => url.pathname.endsWith('/wines') && !url.searchParams.has('country'))).toBe(true)
  await expect(page.getByLabel('País', { exact: true })).toHaveValue('')
})

test('permission denial keeps manual wine browsing usable at phone size', async ({ page }) => {
  const requests: URL[] = []
  await authenticatedApi(page, requests)
  await page.setViewportSize({ width: 320, height: 740 })
  await page.addInitScript(() => Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: (_success: PositionCallback, failure: PositionErrorCallback) => failure({ code: 1 } as GeolocationPositionError) } }))
  await page.goto('/wines')
  await expect(page.getByRole('status').filter({ hasText: /todas las ubicaciones/i })).toBeVisible()
  await page.getByLabel('País', { exact: true }).selectOption('France')
  await expect.poll(() => requests.some(url => url.pathname.endsWith('/wines') && url.searchParams.get('country') === 'France')).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('nearby events accept zero coordinates and manual filters explicitly switch to global', async ({ page }) => {
  const requests: URL[] = []
  await authenticatedApi(page, requests)
  await page.addInitScript(() => Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: (success: PositionCallback) => success({ coords: { latitude: 0, longitude: 0 } } as GeolocationPosition) } }))
  await page.goto('/events')
  await expect.poll(() => requests.some(url => url.pathname.endsWith('/events/discovery') && url.searchParams.get('latitude') === '0' && url.searchParams.get('longitude') === '0' && url.searchParams.get('radiusKm') === '100')).toBe(true)
  expect(requests.some(url => url.pathname.endsWith('/events'))).toBe(false)
  await page.getByLabel('País', { exact: true }).selectOption('France')
  await expect.poll(() => requests.some(url => url.pathname.endsWith('/events') && url.searchParams.get('country') === 'France')).toBe(true)
  await expect(page.getByRole('status').filter({ hasText: /todas las ubicaciones/i })).toBeVisible()
})
