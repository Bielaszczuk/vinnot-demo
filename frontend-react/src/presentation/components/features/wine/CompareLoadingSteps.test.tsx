import { act, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { CompareLoadingSteps } from './CompareLoadingSteps'

afterEach(() => vi.useRealTimers())

async function mount(lng: 'en-US' | 'es-AR') {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } } })
  return render(<I18nextProvider i18n={i18n}><CompareLoadingSteps /></I18nextProvider>)
}

it('shows the comparison steps in English', async () => {
  vi.useFakeTimers()
  await mount('en-US')
  expect(screen.getAllByText(en.compare.steps.opening)).toHaveLength(2)
  expect(screen.queryByText(es.compare.steps.opening)).toBeNull()
  act(() => vi.advanceTimersByTime(2200 * 6))
  expect(screen.getAllByText(en.compare.steps.writing)).toHaveLength(2)
})

it('keeps the Spanish copy for Spanish', async () => {
  await mount('es-AR')
  expect(screen.getByText(es.compare.steps.structure)).toBeInTheDocument()
})
