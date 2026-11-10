import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useCurrentTime } from './useCurrentTime'
afterEach(() => vi.useRealTimers())
it('updates while open and on focus, and releases its timer on unmount', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-01T20:00:00Z'))
  const { result, unmount } = renderHook(useCurrentTime)
  act(() => vi.advanceTimersByTime(30_000))
  expect(result.current.toISOString()).toBe('2026-10-01T20:00:30.000Z')
  vi.setSystemTime(new Date('2026-10-02T20:00:00Z'))
  act(() => window.dispatchEvent(new Event('focus')))
  expect(result.current.toISOString()).toBe('2026-10-02T20:00:00.000Z')
  unmount(); expect(vi.getTimerCount()).toBe(0)
})
