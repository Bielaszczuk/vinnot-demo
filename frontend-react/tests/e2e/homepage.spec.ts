/**
 * E2E — Homepage smoke test (updated for React frontend)
 */
import { test, expect } from './fixtures'

test.describe('Homepage', () => {
  test('loads and shows branding', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('banner').getByRole('link', { name: 'Vinnot' })).toBeVisible()
  })

  test('shows hero title on the landing page', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Descubrí el vino perfecto')).toBeVisible()
  })

  test('shows Explore Wines CTA', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Explorar vinos', exact: true })).toBeVisible()
  })

  test('header contains sign-in button when not logged in', async ({ page }) => {
    await page.goto('/')
    const signInButton = page.getByRole('banner').getByRole('link', { name: 'Iniciar sesión', exact: true })
    await expect(signInButton).toBeVisible()
  })
})
