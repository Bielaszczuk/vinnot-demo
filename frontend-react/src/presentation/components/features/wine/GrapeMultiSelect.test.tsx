import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, it, vi } from 'vitest'
import { GrapeMultiSelect } from './GrapeMultiSelect'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: Record<string, unknown>) => `${key}${options?.query ? `:${options.query}` : ''}${options?.name ? `:${options.name}` : ''}` }),
}))

function Harness({ initial = [] as string[], onChange = vi.fn() }) {
  const [value, setValue] = useState(initial)
  return <GrapeMultiSelect label="Grape variety" value={value} onChange={(next) => { setValue(next); onChange(next) }} options={['Malbec', 'Cabernet Sauvignon', 'Torrontés']} />
}

it('searches the grape catalog, ignoring accents, and adds the chosen variety as a chip', () => {
  const onChange = vi.fn()
  render(<Harness onChange={onChange} />)
  const input = screen.getByRole('combobox', { name: 'Grape variety' })
  fireEvent.change(input, { target: { value: 'torron' } })
  fireEvent.mouseDown(screen.getByRole('option', { name: 'Torrontés' }))
  expect(onChange).toHaveBeenLastCalledWith(['Torrontés'])
  expect(input).toHaveValue('')
  expect(screen.getByRole('button', { name: 'forms.grapes.remove:Torrontés' })).toBeInTheDocument()
})

it('does not offer varieties that are already chosen', () => {
  render(<Harness initial={['Malbec']} />)
  fireEvent.focus(screen.getByRole('combobox', { name: 'Grape variety' }))
  expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Cabernet Sauvignon', 'Torrontés'])
})

it('adds a variety outside the catalog through "Other"', () => {
  const onChange = vi.fn()
  render(<Harness initial={['Malbec']} onChange={onChange} />)
  const input = screen.getByRole('combobox', { name: 'Grape variety' })
  fireEvent.change(input, { target: { value: 'Criolla Grande' } })
  expect(screen.getByRole('status')).toHaveTextContent('forms.grapes.empty:Criolla Grande')
  fireEvent.mouseDown(screen.getByRole('option', { name: 'forms.grapes.other:Criolla Grande' }))
  expect(onChange).toHaveBeenLastCalledWith(['Malbec', 'Criolla Grande'])
})

it('offers no "Other" row for a variety that exactly matches the catalog', () => {
  render(<Harness />)
  fireEvent.change(screen.getByRole('combobox', { name: 'Grape variety' }), { target: { value: 'malbec' } })
  expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Malbec'])
})

it('removes a chosen variety', () => {
  const onChange = vi.fn()
  render(<Harness initial={['Malbec', 'Torrontés']} onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: 'forms.grapes.remove:Malbec' }))
  expect(onChange).toHaveBeenLastCalledWith(['Torrontés'])
})
