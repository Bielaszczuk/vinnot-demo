import { test, expect } from './fixtures'

for (const width of [320, 375, 1280]) {
  test(`native artwork and login fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const popups: unknown[] = []
    page.on('popup', popup => popups.push(popup))
    await page.goto('/login')
    await expect(page.getByRole('heading', { level: 1, name: /Bienvenido a/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Vinnot', exact: true }).filter({ visible: true })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('Poppins')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    // Prepare Google before the first click; opening the form must not start authentication.
    await expect(page.locator('script[src*="accounts.google.com/gsi/client"]')).toHaveCount(1)
    expect(popups).toHaveLength(0)
    await page.goto('/')
    const hero = page.locator('img[src*="home-hero"][src$=".webp"]')
    await expect(hero).toBeVisible()
    await expect.poll(() => hero.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
    await expect(hero).toHaveCSS('opacity', '1')
    for (const name of ['redglass', 'whiteglass', 'roseglass', 'sparklinglass']) {
      const image = page.locator(`img[src="/images/brand/${name}.png"]`)
      await image.scrollIntoViewIfNeeded()
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
      await expect(image.locator('..').locator('..')).toHaveAttribute('href', /\/wines\?type=/)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('starts the cold hero download from HTML before the application mounts', async ({ page }) => {
  await page.route('**/src/app/main.tsx', route => route.abort())
  const image = page.waitForResponse(response => response.url().endsWith('home-hero.webp'))
  await page.goto('/')
  const response = await image
  expect(response.status()).toBe(200)
  expect((await response.body()).length).toBeLessThan(350_000)
  await expect(page.locator('#root')).toBeEmpty()
})

test('reuses the preload for the rendered hero on a cold visit', async ({ browser, baseURL }) => {
  // Routing disables the HTTP cache in Playwright. Use a fresh, unrouted context
  // for this network assertion instead of the API-intercepting UI fixture.
  const page = await browser.newPage({ baseURL })
  try {
    await page.addInitScript(() => localStorage.setItem('vinnot-logout-pending', '1'))
    await page.goto('/')
    await expect(page.locator('img[src*="home-hero"][src$=".webp"]')).toHaveCSS('opacity', '1')
    const requests = await page.evaluate(() => performance.getEntriesByType('resource')
      .filter(entry => entry.name.includes('home-hero') && entry.name.endsWith('.webp')))
    expect(requests).toHaveLength(1)
  } finally {
    await page.close()
  }
})
