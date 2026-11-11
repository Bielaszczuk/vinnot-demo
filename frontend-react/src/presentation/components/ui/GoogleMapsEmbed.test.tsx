import { render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import i18n from '@shared/i18n'
import { privacyPreferencesService } from '@/application/services/privacyPreferences.service'

async function loadEmbed(apiKey: string) {
  vi.resetModules()
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', apiKey)
  return (await import('./GoogleMapsEmbed')).GoogleMapsEmbed
}

afterEach(async () => {
  vi.unstubAllEnvs()
  privacyPreferencesService.setExternalMaps(false)
  await i18n.changeLanguage('es-AR')
})

it('explains in English that the map is unavailable when no key is configured', async () => {
  await i18n.changeLanguage('en-US')
  privacyPreferencesService.setExternalMaps(true)
  const GoogleMapsEmbed = await loadEmbed('')
  render(<GoogleMapsEmbed query="Mendoza" />)
  expect(screen.getByText('We could not show the map right now.')).toBeInTheDocument()
})

it('explains in Spanish that the map is unavailable when the map has nothing to show', async () => {
  privacyPreferencesService.setExternalMaps(true)
  const GoogleMapsEmbed = await loadEmbed('test-key')
  render(<GoogleMapsEmbed mode="place" />)
  expect(screen.getByText('No pudimos mostrar el mapa en este momento.')).toBeInTheDocument()
})
