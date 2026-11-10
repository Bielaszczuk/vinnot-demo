import { render, screen } from '@testing-library/react'
import { Wine } from 'lucide-react'
import { expect, it } from 'vitest'
import { Icon } from './Icon'
import { ICON_SIZES, ICON_STROKE } from './iconScale'

it('draws a decorative icon at the small step with the shared stroke', () => {
  const { container } = render(<Icon icon={Wine} className="text-wine-700" />)
  const svg = container.querySelector('svg')!
  expect(svg).toHaveAttribute('aria-hidden', 'true')
  expect(svg).toHaveAttribute('width', String(ICON_SIZES.sm))
  expect(svg).toHaveAttribute('stroke-width', String(ICON_STROKE))
  expect(svg.getAttribute('class')).toContain('text-wine-700')
})

it('names a meaningful icon and follows the size scale', () => {
  render(<Icon icon={Wine} size="xl" label="Vino" />)
  const svg = screen.getByRole('img', { name: 'Vino' })
  expect(svg).toHaveAttribute('width', '32')
  expect(svg).not.toHaveAttribute('aria-hidden')
})
