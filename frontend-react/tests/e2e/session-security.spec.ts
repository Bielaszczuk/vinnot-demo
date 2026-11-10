import { test, expect } from './fixtures'

test('admin confirmation cancels safely and retries only with proof', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('vinnot-logout-pending'))
  const user = { id: '00000000-0000-0000-0000-000000000001', username: 'qa', name: 'QA Admin',
    email: 'qa@example.org', roles: ['ROLE_ADMIN'], emailVerified: true, onboardingCompleted: true }
  let writes = 0
  let confirmations = 0
  await page.route(/^https?:\/\/[^/]+\/api\//, async route => {
    const path = new URL(route.request().url()).pathname
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path.endsWith('/auth/web/refresh')) return json({ accessToken: 'controlled-access', tokenType: 'Bearer', expiresIn: 60000, user })
    if (path.endsWith('/auth/me')) return json(user)
    if (path.endsWith('/legal/acceptance')) return json({ required: false, acceptedAt: '2026-01-01T00:00:00Z', document: {
      version: 'qa', acceptanceRevision: 'qa', locale: 'es', contentHash: 'a'.repeat(64), title: 'Terms', summary: 'QA',
      sections: [{ id: 'one', title: 'Section', body: 'Controlled content' }],
    } })
    if (path.endsWith('/auth/reauthenticate')) {
      confirmations++
      return route.request().postDataJSON().password === 'correct-password' ? json({ proof: 'controlled-proof' }) : json({ code: 'AUTH_FAILED' }, 401)
    }
    if (path.endsWith('/role')) {
      if (route.request().headers()['x-admin-reauthentication'] !== 'controlled-proof') return json({ code: 'REAUTHENTICATION_REQUIRED' }, 403)
      writes++
      return json({})
    }
    if (path.endsWith('/users')) return json({ content: [{ ...user, id: 'target', roles: ['ROLE_USER'], active: true }], totalElements: 1, totalPages: 1, page: 0, size: 20 })
    return json({ content: [], totalElements: 0, totalPages: 0 })
  })
  await page.goto('/admin/users')
  const selector = page.locator('tbody select').first()
  await selector.selectOption('ROLE_PARTNER')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(writes).toBe(0)
  expect(confirmations).toBe(0)
  await selector.selectOption('ROLE_MODERATOR')
  await expect(dialog).toBeVisible()
  await dialog.locator('input[type="password"]').fill('wrong-password')
  await dialog.locator('button[type="submit"]').click()
  await expect(dialog.locator('input[type="password"]')).toBeEnabled()
  expect(writes).toBe(0)
  await dialog.locator('input[type="password"]').fill('correct-password')
  await dialog.locator('button[type="submit"]').click()
  await expect(dialog).not.toBeVisible()
  await expect.poll(() => writes).toBe(1)
  expect(confirmations).toBe(2)
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('controlled-access')
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('controlled-proof')
})
