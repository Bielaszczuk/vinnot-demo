/**
 * E2E — Wine module pages
 */
import { test, expect } from './fixtures'

test.describe('Wine Pages', () => {
  test('wine search requires a session', async ({ page }) => {
    await page.goto('/wines')
    await expect(page).toHaveURL(/\/login\?returnUrl=/)
    await expect(page.getByRole('heading', { level: 1, name: 'Bienvenido a vinnot' })).toBeVisible()
  })

  test('wine comparison requires a session', async ({ page }) => {
    await page.goto('/wines/compare')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { level: 1, name: 'Bienvenido a vinnot' })).toBeVisible()
  })

  test('wine scan route preserves the existing session guard', async ({ page }) => {
    await page.goto('/wines/scan')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { level: 1, name: 'Bienvenido a vinnot' })).toBeVisible()
  })
})
