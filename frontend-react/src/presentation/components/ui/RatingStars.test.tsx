import { fireEvent, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { RatingStars } from './RatingStars'

async function mount(ui: React.ReactElement, lng: 'en-US' | 'es-AR' = 'es-AR') {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } } })
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

it('reads a display rating as one translated image with the rating color', async () => {
  await mount(<RatingStars value={4.3} />)
  const stars = screen.getByRole('img', { name: '4,3 de 5 estrellas' })
  expect(stars.querySelectorAll('svg')).toHaveLength(5)
  expect(stars.querySelectorAll('.text-rating')).toHaveLength(4)
  expect(screen.queryByRole('button')).toBeNull()
  expect(screen.queryByRole('radio')).toBeNull()
})

it('reads the display rating in English', async () => {
  await mount(<RatingStars value={3} size="sm" />, 'en-US')
  expect(screen.getByRole('img', { name: '3 out of 5 stars' })).toBeInTheDocument()
})

it('lets the user pick a rating with a click and reports the choice', async () => {
  const onChange = vi.fn()
  await mount(<RatingStars value={2} onChange={onChange} label="Tu puntuación" size="lg" />)
  const group = screen.getByRole('radiogroup', { name: 'Tu puntuación' })
  expect(group).toBeInTheDocument()
  const four = screen.getByRole('radio', { name: '4 estrellas' })
  expect(screen.getByRole('radio', { name: '1 estrella' })).toHaveAttribute('aria-checked', 'false')
  expect(screen.getByRole('radio', { name: '2 estrellas' })).toHaveAttribute('aria-checked', 'true')
  expect(screen.getByRole('radio', { name: '2 estrellas' })).toHaveAttribute('tabindex', '0')
  expect(four).toHaveAttribute('tabindex', '-1')
  expect(four.className).toContain('focus-visible:ring-2')
  fireEvent.click(four)
  expect(onChange).toHaveBeenCalledWith(4)
})

it('moves the rating with the arrow keys, Home and End, within 1 to 5', async () => {
  const onChange = vi.fn()
  await mount(<RatingStars value={0} onChange={onChange} />)
  expect(screen.getByRole('radiogroup', { name: 'Puntuación' })).toBeInTheDocument()
  const first = screen.getByRole('radio', { name: '1 estrella' })
  expect(first).toHaveAttribute('tabindex', '0')
  fireEvent.keyDown(first, { key: 'ArrowRight' })
  expect(onChange).toHaveBeenLastCalledWith(1)
  fireEvent.keyDown(first, { key: 'ArrowLeft' })
  expect(onChange).toHaveBeenLastCalledWith(1)
  fireEvent.keyDown(first, { key: 'End' })
  expect(onChange).toHaveBeenLastCalledWith(5)
  fireEvent.keyDown(first, { key: 'Home' })
  expect(onChange).toHaveBeenLastCalledWith(1)
  fireEvent.keyDown(first, { key: 'ArrowUp' })
  expect(onChange).toHaveBeenLastCalledWith(1)
  fireEvent.keyDown(first, { key: 'Tab' })
  expect(onChange).toHaveBeenCalledTimes(5)
})

it('lowers the rating with ArrowDown and keeps it at 5 at the top', async () => {
  const onChange = vi.fn()
  await mount(<RatingStars value={5} onChange={onChange} />)
  const five = screen.getByRole('radio', { name: '5 estrellas' })
  fireEvent.keyDown(five, { key: 'ArrowDown' })
  expect(onChange).toHaveBeenLastCalledWith(4)
  fireEvent.keyDown(five, { key: 'ArrowRight' })
  expect(onChange).toHaveBeenLastCalledWith(5)
})

it('does not change while disabled', async () => {
  const onChange = vi.fn()
  await mount(<RatingStars value={3} onChange={onChange} disabled />, 'en-US')
  const one = screen.getByRole('radio', { name: '1 star' })
  expect(one).toBeDisabled()
  fireEvent.click(one)
  fireEvent.keyDown(one, { key: 'ArrowLeft' })
  expect(onChange).not.toHaveBeenCalled()
})
