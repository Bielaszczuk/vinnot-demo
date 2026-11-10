import { expect, it } from 'vitest'
import { formatWineDisplayName } from './wine'

it('appends only the grapes the wine name does not already mention', () => {
  expect(formatWineDisplayName('100 X 100 Reserve Pinot Noir', ['Pinot Noir'])).toBe('100 X 100 Reserve Pinot Noir')
  expect(formatWineDisplayName('Gran Reserva chardonnay', ['Chardonnay'])).toBe('Gran Reserva chardonnay')
  expect(formatWineDisplayName('Blend de Altura', ['Malbec', 'Cabernet Franc'])).toBe('Blend de Altura  Malbec - Cabernet Franc')
  expect(formatWineDisplayName('Malbec Reserva', ['Malbec', 'Syrah'])).toBe('Malbec Reserva  Syrah')
  expect(formatWineDisplayName('Some Wine', [])).toBe('Some Wine')
  expect(formatWineDisplayName('Some Wine')).toBe('Some Wine')
})
