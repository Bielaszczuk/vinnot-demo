import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { VintagePill } from './VintagePill'
import { VintageSelect } from './VintageSelect'

async function mount(lng: 'es-AR' | 'en-US', node: React.ReactNode) {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'es-AR': { translation: es }, 'en-US': { translation: en } } })
  return render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>)
}

function Controlled({ initial = null, catalogVintage, onChange }: {
  initial?: number | null; catalogVintage?: number | null; onChange: (value: number | null) => void
}) {
  const [value, setValue] = useState<number | null>(initial)
  return <VintageSelect value={value} catalogVintage={catalogVintage}
    onChange={(next) => { setValue(next); onChange(next) }} />
}

describe('VintageSelect', () => {
  it('offers no vintage first, then the label vintage, then every year down to 1900', async () => {
    const currentYear = new Date().getFullYear()
    await mount('en-US', <Controlled catalogVintage={2018} onChange={() => {}} />)
    const select = screen.getByLabelText('Vintage')
    const options = within(select).getAllByRole('option')
    expect(options[0]).toHaveTextContent('No vintage')
    expect(options[0]).toHaveValue('')
    expect(options[1]).toHaveTextContent('2018 · Label vintage')
    expect(options[2]).toHaveTextContent(String(currentYear))
    expect(options.at(-1)).toHaveTextContent('1900')
    expect(options.filter((option) => option.textContent?.includes('2018'))).toHaveLength(1)
    expect(select).toHaveValue('')
  })

  it('lists only years when the wine has no catalog vintage, in Spanish', async () => {
    await mount('es-AR', <Controlled onChange={() => {}} />)
    const select = screen.getByLabelText('Añada')
    const options = within(select).getAllByRole('option')
    expect(options[0]).toHaveTextContent('Sin añada')
    expect(options[1]).toHaveTextContent(String(new Date().getFullYear()))
  })

  it('reports the chosen year as a number and a cleared choice as null', async () => {
    const onChange = vi.fn()
    await mount('en-US', <Controlled initial={2015} onChange={onChange} />)
    const select = screen.getByLabelText('Vintage')
    expect(select).toHaveValue('2015')
    fireEvent.change(select, { target: { value: '2019' } })
    expect(onChange).toHaveBeenLastCalledWith(2019)
    expect(select).toHaveValue('2019')
    fireEvent.change(select, { target: { value: '' } })
    expect(onChange).toHaveBeenLastCalledWith(null)
  })
})

describe('VintagePill', () => {
  it('reads the vintage in the active language', async () => {
    const english = await mount('en-US', <VintagePill year={2018} />)
    expect(screen.getByText('Vintage 2018')).toBeInTheDocument()
    english.unmount()
    await mount('es-AR', <VintagePill year={2018} />)
    expect(screen.getByText('Añada 2018')).toBeInTheDocument()
  })
})
