import { test, expect } from './fixtures'

const failures = [
  { name: 'CORS denial from a proxy', status: 403, body: 'Invalid CORS request', message: 'No pudimos completar la solicitud. Recargá la página' },
  { name: 'unavailable upstream', status: 502, body: '<html>upstream connection refused</html>', message: 'Vinnot no está disponible en este momento.' },
  { name: 'Vite proxy failure', status: 500, body: '', message: 'Vinnot no está disponible en este momento.' },
  { name: 'invalid credentials', status: 401, body: '{"code":"AUTH_FAILED","message":"Invalid credentials"}', message: 'El correo o la contraseña no son correctos.' },
  { name: 'rate limit', status: 429, body: '', message: 'Hubo demasiados intentos.' },
  { name: 'connection refused', status: 0, body: '', message: 'No pudimos conectarnos con Vinnot.' },
]
for (const failure of failures) {
  test(`login handles ${failure.name} and allows another attempt`, async ({ page }) => {
    await page.route('**/api/auth/web/login', route => failure.status === 0
      ? route.abort('connectionrefused')
      : route.fulfill({ status: failure.status, contentType: 'text/plain', body: failure.body }))
    await page.goto('/login')
    await page.getByLabel('Correo electrónico', { exact: true }).fill('qa@example.invalid')
    await page.getByLabel('Contraseña', { exact: true }).fill('InvalidPassword123')
    const button = page.getByRole('button', { name: 'Iniciar sesión', exact: true })
    await button.click()
    await expect(page.getByText(failure.message, { exact: false })).toBeVisible()
    await expect(button).toBeEnabled()
    await expect(page.getByText(/Request failed|Invalid CORS|upstream connection|Invalid credentials/)).toHaveCount(0)
    await page.route('**/api/auth/web/login', route => route.fulfill({ status: 401, json: { code: 'AUTH_FAILED' } }))
    await button.click()
    await expect(page.getByText('El correo o la contraseña no son correctos.', { exact: false })).toBeVisible()
  })
}

test('email verification guidance remains actionable', async ({ page }) => {
  await page.route('**/api/auth/web/login', route => route.fulfill({ status: 403, json: { code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email' } }))
  await page.goto('/login')
  await page.getByLabel('Correo electrónico', { exact: true }).fill('qa@example.invalid')
  await page.getByLabel('Contraseña', { exact: true }).fill('InvalidPassword123')
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  await expect(page.getByText('Verificá tu correo antes de iniciar sesión.', { exact: false })).toBeVisible()
  await expect(page.locator('a[href*="register/success?email="]')).toBeVisible()
})
