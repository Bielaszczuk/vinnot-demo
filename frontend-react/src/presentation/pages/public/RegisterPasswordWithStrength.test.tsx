import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { PasswordWithStrength } from './RegisterPasswordWithStrength'

it('grows the strength bar over time, except under reduced motion', () => {
  render(<PasswordWithStrength label="Password" placeholder="" />)
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Abcdefgh1!' } })
  const bar = screen.getByText('Fuerte').previousElementSibling!.firstElementChild!
  expect(bar).toHaveClass('bg-green-500', 'transition-all', 'duration-500', 'motion-reduce:transition-none')
})
