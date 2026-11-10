import { test, expect, authenticatedApi } from './fixtures'

test('anonymous reload probes a session without HTTP failures or private-profile requests', async ({ page }) => {
  const paths: string[] = []
  const failed: string[] = []
  await page.addInitScript(() => localStorage.removeItem('vinnot-logout-pending'))
  page.on('response', response => { if (response.url().includes('/api/auth/') && response.status() >= 400) failed.push(response.url()) })
  await page.route(/^https?:\/\/[^/]+\/api\//, route => {
    const path = new URL(route.request().url()).pathname; paths.push(path)
    return route.fulfill({ status: 204, headers: { 'Cache-Control': 'no-store' } })
  })
  await page.goto('/legal')
  await expect(page.getByRole('heading', { name: /Legal, privacidad y confianza/ })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: /Legal, privacidad y confianza/ })).toBeVisible()
  expect(paths.filter(path => path.endsWith('/auth/web/refresh'))).toHaveLength(2)
  expect(paths.some(path => path.endsWith('/auth/me'))).toBe(false)
  expect(failed).toEqual([])
})

test('a delayed accepted agreement never mounts the consent screen', async ({ page }) => {
  await authenticatedApi(page, [])
  await page.addInitScript(() => {
    const state = window as Window & { consentWasMounted?: boolean }
    state.consentWasMounted = false
    new MutationObserver(() => {
      if (document.body?.textContent?.includes('Antes de continuar')) state.consentWasMounted = true
    }).observe(document, { childList: true, subtree: true })
  })
  let release!: () => void
  const responseReady = new Promise<void>(done => { release = done })
  await page.route(url => url.pathname.endsWith('/legal/acceptance'), async route => {
    await responseReady
    await route.fulfill({ json: { required: false, acceptedAt: '2026-10-01T00:00:00Z', document: {
      version: 'qa', acceptanceRevision: 'qa', locale: 'es', contentHash: 'a'.repeat(64),
      title: 'Terms', summary: 'QA', sections: [{ id: 'one', title: 'Section', body: 'Controlled content' }],
    } } })
  })
  await page.goto('/wines')
  await expect(page.getByRole('status', { name: '' }).filter({ hasText: 'Verificando tu cuenta' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Aceptar y continuar' })).toHaveCount(0)
  release()
  await expect(page.getByLabel('País', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Aceptar y continuar' })).toHaveCount(0)
  expect(await page.evaluate(() => (window as Window & { consentWasMounted?: boolean }).consentWasMounted)).toBe(false)
})
