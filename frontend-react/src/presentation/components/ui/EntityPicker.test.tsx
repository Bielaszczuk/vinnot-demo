import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, it, vi } from 'vitest'
import { EntityPicker } from './EntityPicker'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: Record<string, unknown>) => (options?.name ? `${key}:${options.name}` : key) }),
}))

type Winery = { id: string; name: string; region: string }
const wineries: Winery[] = [
  { id: 'w1', name: 'Bodega Norte', region: 'Salta' },
  { id: 'w2', name: 'Bodega Sur', region: 'Neuquén' },
]

function Harness({ options = wineries, onSelect = vi.fn(), onCreate, loading = false, selected }: {
  options?: Winery[]; onSelect?: (winery: Winery) => void; onCreate?: (query: string) => void; loading?: boolean; selected?: string
}) {
  const [query, setQuery] = useState('')
  return (
    <EntityPicker<Winery>
      label="Winery"
      query={query}
      onQueryChange={setQuery}
      options={query.trim().length >= 2 ? options : []}
      loading={loading}
      getOptionKey={(winery) => winery.id}
      getOptionLabel={(winery) => winery.name}
      getOptionDescription={(winery) => winery.region}
      onSelect={onSelect}
      emptyLabel={(text) => `Nothing for ${text}`}
      onCreate={onCreate}
      createLabel={(text) => `+ Create winery «${text}»`}
      selectedLabel={selected}
    />
  )
}

it('is a labelled combobox that lists the results in a listbox', () => {
  render(<Harness />)
  const input = screen.getByRole('combobox', { name: 'Winery' })
  expect(input).toHaveAttribute('aria-expanded', 'false')
  fireEvent.change(input, { target: { value: 'Bod' } })
  expect(input).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('listbox')).toBeInTheDocument()
  expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Bodega NorteSalta', 'Bodega SurNeuquén'])
})

it('shows the empty state and a create row with the typed text when nothing matches', () => {
  const onCreate = vi.fn()
  render(<Harness options={[]} onCreate={onCreate} />)
  fireEvent.change(screen.getByRole('combobox', { name: 'Winery' }), { target: { value: 'Bodega Nueva' } })
  expect(screen.getByRole('status')).toHaveTextContent('Nothing for Bodega Nueva')
  fireEvent.mouseDown(screen.getByRole('option', { name: '+ Create winery «Bodega Nueva»' }))
  expect(onCreate).toHaveBeenCalledWith('Bodega Nueva')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})

it('shows a searching state instead of the empty state while results load', () => {
  render(<Harness options={[]} loading />)
  fireEvent.change(screen.getByRole('combobox', { name: 'Winery' }), { target: { value: 'Bod' } })
  expect(screen.getByRole('status')).toHaveTextContent('forms.entityPicker.loading')
  expect(screen.queryByText('Nothing for Bod')).not.toBeInTheDocument()
})

it('moves through the options with the arrow keys and picks one with Enter', () => {
  const onSelect = vi.fn()
  const onCreate = vi.fn()
  render(<Harness onSelect={onSelect} onCreate={onCreate} />)
  const input = screen.getByRole('combobox', { name: 'Winery' })
  fireEvent.change(input, { target: { value: 'Bod' } })
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  expect(input).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0]!.id)
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  expect(screen.getAllByRole('option')[2]).toHaveAttribute('aria-selected', 'true')
  fireEvent.keyDown(input, { key: 'ArrowUp' })
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(onSelect).toHaveBeenCalledWith(wineries[1])
  expect(onCreate).not.toHaveBeenCalled()
})

it('closes the list on Escape without letting the dialog behind close', () => {
  const documentEscape = vi.fn()
  document.addEventListener('keydown', documentEscape)
  render(<Harness />)
  const input = screen.getByRole('combobox', { name: 'Winery' })
  fireEvent.change(input, { target: { value: 'Bod' } })
  fireEvent.keyDown(input, { key: 'Escape' })
  expect(input).toHaveAttribute('aria-expanded', 'false')
  expect(documentEscape).not.toHaveBeenCalled()
  document.removeEventListener('keydown', documentEscape)
})

it('announces the current selection under the field', () => {
  render(<Harness selected="Bodega Norte" />)
  expect(screen.getByRole('combobox', { name: 'Winery' })).toHaveAccessibleDescription('forms.entityPicker.selected:Bodega Norte')
})
