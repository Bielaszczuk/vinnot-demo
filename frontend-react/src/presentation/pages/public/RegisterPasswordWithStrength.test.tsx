import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import i18n from '@shared/i18n'
import { PasswordWithStrength } from './RegisterPasswordWithStrength'

afterEach(async () => {
  await i18n.changeLanguage('es-AR')
})

function typePassword(value: string) {
  render(<PasswordWithStrength label="Password" placeholder="" />)
  fireEvent.change(screen.getByLabelText('Password'), { target: { value } })
}

it('grows the strength bar over time, except under reduced motion', () => {
  typePassword('Abcdefgh1!')
  const bar = screen.getByText('Fuerte').previousElementSibling!.firstElementChild!
  expect(bar).toHaveClass('bg-green-500', 'transition-all', 'duration-500', 'motion-reduce:transition-none')
})

it('names the strength in Spanish for each level', () => {
  typePassword('abc')
  expect(screen.getByText('Débil')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Abcdefgh' } })
  expect(screen.getByText('Media')).toBeInTheDocument()
})

it('names the strength in English when the interface is in English', async () => {
  await i18n.changeLanguage('en-US')
  typePassword('abc')
  expect(screen.getByText('Weak')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Abcdefgh' } })
  expect(screen.getByText('Medium')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Abcdefgh1!' } })
  expect(screen.getByText('Strong')).toBeInTheDocument()
})
