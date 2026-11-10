import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { PageBanner } from './PageBanner'

// overflow-hidden boxes can still be scrolled by focus(); after a modal returned focus to a banner
// button, the browser shifted the banner sideways and cut the title. overflow-clip cannot scroll.
it('clips its decoration without becoming a scroll container', () => {
  render(<PageBanner title="Gestión de rutas" actions={<button type="button">Nueva ruta</button>} />)
  const banner = screen.getByRole('banner')
  expect(banner.className).toContain('overflow-clip')
  expect(banner.className).not.toContain('overflow-hidden')
})
