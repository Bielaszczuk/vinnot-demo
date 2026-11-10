import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { PublicDocumentPage } from './PublicDocumentPage'

const page = {
  title: { es: 'Ayuda', en: 'Help' }, summary: { es: 'Resumen', en: 'Summary' },
  sections: [{ id: 'scan', title: { es: 'Escaneo', en: 'Scanning' }, body: { es: 'Cómo escanear', en: 'How to scan' } }],
}
const retry = vi.fn()
vi.mock('@/presentation/hooks/usePublicDocument', () => ({
  usePublicDocument: () => ({ page, version: '2026-10', termsUnconfirmed: true, retry }),
}))
vi.mock('./PublicHero', () => ({
  PublicHero: ({ eyebrow, children }: { eyebrow: string; children?: React.ReactNode }) => <header><p>{eyebrow}</p>{children}</header>,
}))

async function mount(lng: 'en-US' | 'es-AR') {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } } })
  render(<I18nextProvider i18n={i18n}><MemoryRouter><PublicDocumentPage slug="help" /></MemoryRouter></I18nextProvider>)
}

it.each([['en-US', en], ['es-AR', es]] as const)('takes its labels from the %s locale file', async (lng, copy) => {
  await mount(lng)
  expect(screen.getByText(copy.publicDocument.eyebrow)).toBeInTheDocument()
  expect(screen.getByText(copy.publicDocument.version.replace('{{version}}', '2026-10'))).toBeInTheDocument()
  expect(screen.getByRole('navigation', { name: copy.publicDocument.onThisPage })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: copy.publicDocument.contact })).toHaveAttribute('href', '/contact')
  fireEvent.change(screen.getByLabelText(copy.publicDocument.searchHelp), { target: { value: 'zzzz' } })
  expect(screen.getByText(copy.publicDocument.noResults)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: copy.publicDocument.refresh }))
  expect(retry).toHaveBeenCalled()
})
