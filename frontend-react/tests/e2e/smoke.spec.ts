import { test, expect } from './fixtures'

test('homepage loads and shows React frontend content', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('banner').getByRole('link', { name: 'Vinnot' })).toBeVisible()
  await expect(page.locator('text=Descubrí el vino perfecto')).toBeVisible()
})

