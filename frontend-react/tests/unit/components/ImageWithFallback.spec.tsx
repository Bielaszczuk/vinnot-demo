import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ImageWithFallback } from '@components/ui/ImageWithFallback'

describe('ImageWithFallback', () => {
  it('renders the new image when src changes after a previous load error', () => {
    const { rerender } = render(
      <ImageWithFallback
        src="/broken-avatar.jpg"
        alt="Avatar"
        fallbackElement={<span>No image</span>}
      />,
    )

    fireEvent.error(screen.getByRole('img', { name: 'Avatar' }))
    expect(screen.getByText('No image')).toBeInTheDocument()

    rerender(
      <ImageWithFallback
        src="/working-avatar.jpg"
        alt="Avatar"
        fallbackElement={<span>No image</span>}
      />,
    )

    expect(screen.getByRole('img', { name: 'Avatar' })).toHaveAttribute(
      'src',
      '/working-avatar.jpg',
    )
    expect(screen.queryByText('No image')).not.toBeInTheDocument()
  })
})
