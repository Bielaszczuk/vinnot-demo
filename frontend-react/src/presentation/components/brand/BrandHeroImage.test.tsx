import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BrandHeroImage } from './BrandHeroImage'

describe('BrandHeroImage', () => {
  it('reveals the whole image only after loading without delaying surrounding content', () => {
    const { container, getByText } = render(<><BrandHeroImage className="object-cover" /><h1>Vinnot</h1></>)
    const image = container.querySelector('img')!
    expect(getByText('Vinnot')).toBeVisible()
    expect(image).toHaveStyle({ opacity: 0 })
    expect(image).toHaveAttribute('loading', 'eager')
    expect(image).toHaveAttribute('fetchpriority', 'high')
    expect(image).toHaveAttribute('width', '1446')
    expect(image).toHaveClass('object-cover')
    fireEvent.load(image)
    expect(image).toHaveStyle({ opacity: 1 })
  })

  it('keeps a failed decorative image hidden', () => {
    const { container } = render(<BrandHeroImage />)
    const image = container.querySelector('img')!
    fireEvent.error(image)
    expect(image).toHaveStyle({ opacity: 0 })
    expect(image).toHaveAttribute('alt', '')
  })
})
