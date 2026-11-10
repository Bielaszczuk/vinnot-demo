import { act, fireEvent, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { useState } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { expect, it } from 'vitest'
import en from '@i18n/locales/en-US.json'
import { Modal } from '@components/ui/Modal'
import { EventDateTimeField } from './EventDateTimeField'

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
}

function Form() {
  const [value, setValue] = useState('')
  return (
    <Modal isOpen onClose={() => {}} ariaLabel="Create event">
      <button type="button">First control</button>
      <EventDateTimeField label="Start" value={value} onChange={setValue} />
    </Modal>
  )
}

it('opens the date and time picker inside a dialog and keeps it open while choosing a day', async () => {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng: 'en-US', resources: { 'en-US': { translation: en } }, interpolation: { escapeValue: false } })
  render(<I18nextProvider i18n={i18n}><Form /></I18nextProvider>)
  fireEvent.click(screen.getByRole('button', { name: /^Start:/ }))
  expect(await screen.findByRole('grid')).toBeInTheDocument()
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
  expect(screen.getByRole('grid')).toBeInTheDocument()
  expect(document.activeElement?.closest('[data-radix-popper-content-wrapper]')).not.toBeNull()
  fireEvent.click(screen.getAllByRole('gridcell').find(cell => cell.textContent === '15')!.querySelector('button')!)
  expect(screen.getByRole('grid')).toBeInTheDocument()
  expect(screen.getByLabelText(en.events.dateTime.hour)).toBeEnabled()
})
