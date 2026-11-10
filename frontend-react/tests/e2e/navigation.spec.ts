/**
 * E2E — Navigation and public pages
 */
import { test, expect } from './fixtures'

test.describe('Public Navigation', () => {
  test('navigates to /wines page', async ({ page }) => {
    await page.goto('/wines')
    await expect(page).toHaveURL(/\/login\?returnUrl=/)
  })

  test('navigates to /events page', async ({ page }) => {
    await page.goto('/events')
    await expect(page).toHaveURL(/\/login\?returnUrl=/)
  })

  test('navigates to /wine-routes page', async ({ page }) => {
    await page.goto('/wine-routes')
    await expect(page).toHaveURL(/\/login\?returnUrl=/)
  })

  test('navigates to /about page', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByRole('heading', { level: 1, name: 'Acerca de Vinnot' })).toBeVisible()
  })

  test('navigates to /contact page', async ({ page }) => {
    await page.goto('/contact')
    await expect(page.getByRole('heading', { level: 1, name: 'Hablemos' })).toBeVisible()
  })

  test('shows 404 page for unknown routes', async ({ page }) => {
    await page.goto('/this-does-not-exist')
    await expect(page.getByRole('heading', { level: 1, name: 'No encontramos esta página' })).toBeVisible()
  })
})

test.describe('Auth Routes', () => {
  test('shows login page at /login', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=Bienvenido a')).toBeVisible()
  })

  test('shows register page at /register', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('heading', { level: 1, name: 'Crear una cuenta' })).toBeVisible()
  })

  test('redirects /cellar to /login when not authenticated', async ({ page }) => {
    await page.goto('/cellar')
    await page.waitForURL('**/login**')
    await expect(page.locator('text=Bienvenido a')).toBeVisible()
  })

  test('redirects /profile to /login when not authenticated', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForURL('**/login**')
    await expect(page.locator('text=Bienvenido a')).toBeVisible()
  })

  test('redirects /admin to /login when not authenticated', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL('**/login**')
    await expect(page.locator('text=Bienvenido a')).toBeVisible()
  })
})
