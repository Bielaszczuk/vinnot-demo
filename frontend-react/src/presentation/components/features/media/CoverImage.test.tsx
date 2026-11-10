import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { CoverImage } from './CoverImage'
import { coverImagesService } from '@application/services/coverImages.service'
vi.mock('@application/services/coverImages.service', () => ({ coverImagesService: { preview: vi.fn() } }))
Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:cover' })
Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => {} })
beforeEach(() => vi.clearAllMocks())

it('shows a neutral placeholder, not the fallback illustration, while an uploaded cover loads', async () => {
  let resolve!: (value: Blob) => void
  vi.mocked(coverImagesService.preview).mockReturnValueOnce(new Promise(done => { resolve = done }))
  render(<CoverImage src="/api/uploads/covers/a.webp" fallbackSrc="/illustration.png" alt="Harvest" className="h-40" />)
  const placeholder = screen.getByRole('img', { name: 'Harvest' })
  expect(placeholder.tagName).toBe('SPAN')
  expect(placeholder).toHaveAttribute('aria-busy', 'true')
  expect(placeholder).toHaveClass('h-40')
  await act(async () => resolve(new Blob(['a'])))
  expect(screen.getByRole('img', { name: 'Harvest' })).toHaveAttribute('src', 'blob:cover')
})

it('falls back to the illustration when the cover cannot load, and keeps ordinary URLs', async () => {
  vi.mocked(coverImagesService.preview).mockRejectedValueOnce(new Error('offline'))
  const view = render(<CoverImage src="/api/uploads/covers/a.webp" fallbackSrc="/illustration.png" alt="Harvest" />)
  await waitFor(() => expect(screen.getByRole('img', { name: 'Harvest' })).toHaveAttribute('src', '/illustration.png'))
  view.rerender(<CoverImage src="https://legacy.example/x.jpg" fallbackSrc="/illustration.png" alt="Harvest" />)
  expect(screen.getByRole('img', { name: 'Harvest' })).toHaveAttribute('src', 'https://legacy.example/x.jpg')
  view.rerender(<CoverImage src="" fallbackSrc="/illustration.png" alt="Harvest" />)
  expect(screen.getByRole('img', { name: 'Harvest' })).toHaveAttribute('src', '/illustration.png')
})

it('pulses the loading placeholder, except under reduced motion', () => {
  vi.mocked(coverImagesService.preview).mockReturnValueOnce(new Promise(() => {}))
  render(<CoverImage src="/api/uploads/covers/a.webp" fallbackSrc="/illustration.png" alt="Harvest" />)
  expect(screen.getByRole('img', { name: 'Harvest' })).toHaveClass('animate-pulse', 'motion-reduce:animate-none')
})
