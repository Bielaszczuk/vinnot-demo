import { test, expect } from './fixtures'

test('the loading cluster paints progressively and becomes static for reduced motion', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('vinnot-logout-pending'))
  let finishRefresh: () => void = () => {}
  const pendingRefresh = new Promise<void>(resolve => { finishRefresh = resolve })
  await page.route('**/api/auth/web/refresh', async route => {
    await pendingRefresh
    await route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED' } })
  })
  await page.goto('/login')
  await expect(page.getByRole('status')).toBeVisible()
  const fill = page.locator('.vinnot-grape-fill')
  const inspect = (time: number) => fill.evaluate((element, milliseconds) => {
    const animation = element.getAnimations()[0]!
    animation.pause(); animation.currentTime = milliseconds
    return { clip: getComputedStyle(element).clipPath, opacity: getComputedStyle(element).opacity }
  }, time)
  expect((await inspect(0)).clip).toContain('100%')
  expect((await inspect(2500)).clip).not.toContain('100%')
  expect(Number((await inspect(2500)).opacity)).toBeGreaterThan(0.9)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(fill).toHaveCSS('display', 'none')
  await expect(page.locator('.vinnot-grape-base')).toHaveCSS('opacity', '1')
  finishRefresh()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
