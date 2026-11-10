import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import type { TFunction } from 'i18next'
import { expect, it, vi } from 'vitest'
import type { Wine } from '@domain/wine/wine.types'
import { WineCellarModal } from './WineCellarModal'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: { year?: number }) => options?.year ? `${key}:${options.year}` : key }),
}))

const t = ((key: string) => key) as unknown as TFunction
const wine = { id: 'wine-1', name: 'Malbec', vintage: 2020 } as Wine

it('records the chosen vintage in the add-to-cellar form', () => {
  const onConfirm = vi.fn()
  function Harness() {
    const [form, setForm] = useState<React.ComponentProps<typeof WineCellarModal>['cellarForm']>({
      rating: null, purchasePrice: null, notes: '', vintage: null,
    })
    return (
      <WineCellarModal t={t} wine={wine} cellarForm={form} setCellarForm={setForm} addingToCellar={false}
        onClose={() => {}} onConfirm={() => onConfirm(form)} />
    )
  }
  render(<Harness />)
  const select = screen.getByLabelText('vintage.label')
  expect(select).toHaveValue('')
  expect(screen.getByRole('option', { name: 'vintage.catalogOption:2020' })).toBeInTheDocument()
  fireEvent.change(select, { target: { value: '2020' } })
  fireEvent.click(screen.getByRole('button', { name: 'common.save' }))
  expect(onConfirm).toHaveBeenCalledWith({ rating: null, purchasePrice: null, notes: '', vintage: 2020 })
})
