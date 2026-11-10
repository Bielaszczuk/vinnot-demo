import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { fieldClassName } from './fieldStyles'
import { Input } from './Input'
import { Select } from './Select'
import { Textarea } from './Textarea'

const options = [
  { value: 'red', label: 'Tinto' },
  { value: 'white', label: 'Blanco', disabled: true },
]

it('gives inputs, selects and text areas one border, radius and focus ring', () => {
  const base = fieldClassName()
  expect(base).toContain('rounded-xl')
  expect(base).toContain('border-field')
  expect(base).toContain('focus:ring-wine-500/20')
  expect(fieldClassName({ invalid: true })).toContain('border-danger')
  expect(fieldClassName({ tone: 'onDark' })).toContain('bg-white/10')
  expect(fieldClassName({ size: 'sm' })).toContain('min-h-9')
})

it('draws a labelled select with a custom chevron and reports changes', () => {
  const onChange = vi.fn()
  const { container } = render(
    <Select label="Tipo de vino" options={options} placeholder="Elegí un tipo" value="" onChange={onChange} hint="Opcional" />,
  )
  const select = screen.getByRole('combobox', { name: 'Tipo de vino' })
  expect(select.className).toContain('appearance-none')
  expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
  expect(screen.getByRole('option', { name: 'Elegí un tipo' })).toBeDisabled()
  expect(screen.getByRole('option', { name: 'Blanco' })).toBeDisabled()
  expect(select).toHaveAccessibleDescription('Opcional')
  fireEvent.change(select, { target: { value: 'red' } })
  expect(onChange).toHaveBeenCalledTimes(1)
})

it('links a select error to the field and marks it invalid', () => {
  render(<Select id="type" label="Tipo" options={options} error="Elegí uno" />)
  const select = screen.getByRole('combobox', { name: 'Tipo' })
  expect(select).toHaveAttribute('aria-invalid', 'true')
  expect(select).toHaveAccessibleDescription('Elegí uno')
  expect(select.className).toContain('border-danger')
})

it('renders an on-dark select without a visible label and with custom options', () => {
  render(
    <Select aria-label="País" tone="onDark" size="sm" containerClassName="min-w-36">
      <option value="">País</option>
      <option value="AR">Argentina</option>
    </Select>,
  )
  const select = screen.getByRole('combobox', { name: 'País' })
  expect(select.className).toContain('text-white')
  expect(select.className).toContain('min-h-9')
  expect(select).not.toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByRole('option', { name: 'Argentina' })).toBeInTheDocument()
})

it('keeps the input label, hint and error wiring', () => {
  const { rerender } = render(<Input label="Nombre" hint="Como figura en tu documento" />)
  const input = screen.getByRole('textbox', { name: 'Nombre' })
  expect(input).toHaveAccessibleDescription('Como figura en tu documento')
  expect(input.className).toContain('rounded-xl')
  rerender(<Input label="Nombre" error="Completá tu nombre" />)
  expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveAccessibleDescription('Completá tu nombre')
  expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveAttribute('aria-invalid', 'true')
})

it('renders a labelled text area with the field look, hint and error', () => {
  const { rerender } = render(<Textarea label="Comentario" hint="Hasta 500 caracteres" rows={3} />)
  const area = screen.getByRole('textbox', { name: 'Comentario' })
  expect(area.tagName).toBe('TEXTAREA')
  expect(area.className).toContain('rounded-xl')
  expect(area).toHaveAccessibleDescription('Hasta 500 caracteres')
  rerender(<Textarea id="note" label="Comentario" error="Es muy largo" />)
  expect(screen.getByRole('textbox', { name: 'Comentario' })).toHaveAccessibleDescription('Es muy largo')
  rerender(<Textarea aria-label="Nota" />)
  expect(screen.getByRole('textbox', { name: 'Nota' })).not.toHaveAttribute('aria-describedby')
})
