import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { CollapsibleLocationPickerMap, LocationPickerMap } from './LocationPickerMap'
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@components/ui/MapView', () => ({ MapView: ({ latitude, longitude, showMarker, onLocationChanged }: { latitude: number; longitude: number; showMarker: boolean; onLocationChanged: (lat: number, lng: number) => void }) => <button onClick={() => onLocationChanged(0, 0)}>Map {showMarker ? `${latitude},${longitude}` : 'unselected'}</button> }))
it('starts without selecting the overview center and supports zero coordinates', () => {
  const select = vi.fn()
  const { rerender } = render(<LocationPickerMap latitude={null} longitude={null} onChange={select} />)
  expect(select).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('Map unselected'))
  expect(select).toHaveBeenCalledWith(0, 0)
  rerender(<LocationPickerMap latitude={0} longitude={0} onChange={select} />)
  expect(screen.getByText('Map 0,0')).toBeVisible()
})
it('defers loading a stop map until expanded and releases it on collapse', async () => {
  const { container } = render(<CollapsibleLocationPickerMap latitude={null} longitude={null} onChange={vi.fn()} />)
  expect(screen.queryByText('Map unselected')).toBeNull()
  const details = container.querySelector('details')!
  details.open = true
  fireEvent(details, new Event('toggle'))
  await waitFor(() => expect(screen.getByText('Map unselected')).toBeVisible())
  details.open = false
  fireEvent(details, new Event('toggle'))
  await waitFor(() => expect(screen.queryByText('Map unselected')).toBeNull())
})
