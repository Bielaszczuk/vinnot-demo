import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCountryName } from './useCountryName'

const state = vi.hoisted(() => ({ i18n: { language: 'en-US' } as { language: string } | undefined }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: state.i18n }) }))

describe('useCountryName', () => {
  it('shows stored Spanish country names in the interface language', () => {
    state.i18n = { language: 'en-US' }
    const { result } = renderHook(() => useCountryName())
    expect(result.current('Alemania')).toBe('Germany')
    expect(result.current(null)).toBe('')
  })

  it('keeps Spanish when the interface is Spanish or the language is unknown', () => {
    state.i18n = { language: 'es-AR' }
    expect(renderHook(() => useCountryName()).result.current('Germany')).toBe('Alemania')
    state.i18n = undefined
    expect(renderHook(() => useCountryName()).result.current('España')).toBe('España')
  })
})
