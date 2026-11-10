import { cleanup, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { describe, expect, it } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { AdminDeleteConfirm } from './AdminDeleteConfirm'

async function mount(lng: 'es-AR' | 'en-US', entity: 'wines' | 'wineries') {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } } })
  render(
    <I18nextProvider i18n={i18n}>
      <AdminDeleteConfirm open title={i18n.t(`admin.${entity}.deleteTitle`)} message={i18n.t(`admin.${entity}.deleteMessage`)} onCancel={() => {}} onConfirm={() => {}} />
    </I18nextProvider>,
  )
}

describe('admin delete confirmations say what the backend really deletes', () => {
  it('warns that deleting a wine is permanent and takes its reviews, AI profile and cellar entries', async () => {
    await mount('es-AR', 'wines')
    expect(screen.getByText('Esta acción elimina el vino de forma permanente, junto con sus reseñas, su perfil de IA y las entradas en Mi Bodega de cada persona. No se puede deshacer. ¿Continuar?')).toBeInTheDocument()
    cleanup()
    await mount('en-US', 'wines')
    expect(screen.getByText('This permanently deletes the wine, along with its reviews, its AI profile and every cellar entry for it. This cannot be undone. Continue?')).toBeInTheDocument()
  })

  it('says a deleted winery keeps its wines in the catalog without a winery', async () => {
    await mount('es-AR', 'wineries')
    expect(screen.getByText('Se eliminará la bodega. Sus vinos siguen en el catálogo, sin bodega asignada. ¿Continuar?')).toBeInTheDocument()
    cleanup()
    await mount('en-US', 'wineries')
    expect(screen.getByText('The winery will be deleted. Its wines stay in the catalog with no winery. Continue?')).toBeInTheDocument()
  })
})
