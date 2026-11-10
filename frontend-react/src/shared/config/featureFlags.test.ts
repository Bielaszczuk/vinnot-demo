import { afterEach, describe, expect, it, vi } from 'vitest'
import { isEventPaymentsEnabled } from './featureFlags'

afterEach(() => vi.unstubAllEnvs())

describe('event payments rollout', () => {
  it.each(['development', 'production'])('defaults to disabled in %s', (environment) => {
    vi.stubEnv('VITE_APP_ENV', environment)
    vi.stubEnv('VITE_EVENT_PAYMENTS_ENABLED', '')
    vi.stubEnv('VITE_EVENT_PAYMENTS_SANDBOX', '')
    expect(isEventPaymentsEnabled()).toBe(false)
  })

  it('allows an explicitly enabled production UI while leaving authorization to the API', () => {
    vi.stubEnv('VITE_APP_ENV', 'production')
    vi.stubEnv('VITE_EVENT_PAYMENTS_ENABLED', 'true')
    expect(isEventPaymentsEnabled()).toBe(true)
  })

  it('never enables production through the legacy sandbox flag', () => {
    vi.stubEnv('VITE_APP_ENV', 'production')
    vi.stubEnv('VITE_EVENT_PAYMENTS_ENABLED', 'false')
    vi.stubEnv('VITE_EVENT_PAYMENTS_SANDBOX', 'true')
    expect(isEventPaymentsEnabled()).toBe(false)
  })

  it('preserves the explicit local sandbox opt-in', () => {
    vi.stubEnv('VITE_APP_ENV', 'development')
    vi.stubEnv('VITE_EVENT_PAYMENTS_ENABLED', '')
    vi.stubEnv('VITE_EVENT_PAYMENTS_SANDBOX', 'true')
    expect(isEventPaymentsEnabled()).toBe(true)
  })
})
