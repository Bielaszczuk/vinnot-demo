import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { Wine } from '@domain/wine/wine.types'
import { WineTasteProfile } from './WineTasteProfile'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

it('marks the origin of the scale without changing the accessible score', () => {
  render(<WineTasteProfile wine={{ sweetnessScore: 0, bodyScore: 5 } as Wine} />)
  const sweetness = screen.getByRole('progressbar', { name: 'wineDetails.sweetness' })
  expect(sweetness).toHaveAttribute('aria-valuenow', '0')
  expect(sweetness.firstElementChild).toHaveStyle({ width: '3%' })
  expect(screen.getByRole('progressbar', { name: 'wineDetails.body' }).firstElementChild).toHaveStyle({ width: '5%' })
  expect(screen.queryByRole('progressbar', { name: 'wineDetails.acidity' })).not.toBeInTheDocument()
})

it('reads each score as a whole percentage, even when the API sends decimals', () => {
  render(<WineTasteProfile wine={{ bodyScore: 70.0, tanninScore: 54.6 } as Wine} />)
  expect(screen.getByRole('progressbar', { name: 'wineDetails.body' })).toHaveAttribute('aria-valuetext', '70%')
  expect(screen.getByRole('progressbar', { name: 'wineDetails.tannins' })).toHaveAttribute('aria-valuetext', '55%')
})

it('animates the bar width, except under reduced motion', () => {
  render(<WineTasteProfile wine={{ bodyScore: 70 } as Wine} />)
  expect(screen.getByRole('progressbar', { name: 'wineDetails.body' }).firstElementChild).toHaveClass('transition-all', 'duration-700', 'motion-reduce:transition-none')
})
