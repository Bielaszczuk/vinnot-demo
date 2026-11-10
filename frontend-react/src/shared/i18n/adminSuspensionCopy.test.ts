import { expect, it } from 'vitest'
import es from './locales/es-AR.json'
import en from './locales/en-US.json'

it('names the admin account action a suspension, matching the suspended status and the app', () => {
  expect(es.admin.users).toMatchObject({ ban: 'Suspender', unban: 'Reactivar', confirmBanTitle: 'Suspender cuenta', confirmUnbanTitle: 'Reactivar cuenta' })
  expect(es.admin.users.statusLabels.locked).toBe('Suspendida')
  expect(en.admin.users).toMatchObject({ ban: 'Suspend', unban: 'Reactivate', confirmBanTitle: 'Suspend account', confirmUnbanTitle: 'Reactivate account' })
  expect(en.admin.users.statusLabels.locked).toBe('Suspended')
})
