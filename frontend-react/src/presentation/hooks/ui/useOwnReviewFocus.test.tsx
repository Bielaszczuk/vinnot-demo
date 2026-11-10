import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useOwnReviewFocus } from './useOwnReviewFocus'

afterEach(() => vi.restoreAllMocks())
it('waits for the own review and scrolls once, preserving ordinary visits and cancelling unmounted work', () => {
  const frames: FrameRequestCallback[] = []
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length })
  const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
  const scroll = vi.fn()
  const { result, rerender, unmount } = renderHook(({ enabled, id }) => useOwnReviewFocus(enabled, id),
    { initialProps: { enabled: false, id: undefined as string | undefined } })
  result.current.current = { scrollIntoView: scroll } as unknown as HTMLDivElement
  rerender({ enabled: true, id: undefined })
  expect(frames).toHaveLength(0)
  rerender({ enabled: true, id: 'own-review' })
  act(() => frames[0]!(0))
  expect(scroll).toHaveBeenCalledWith({ block: 'start' })
  rerender({ enabled: true, id: 'own-review' })
  expect(frames).toHaveLength(1)
  unmount()
  expect(cancel).toHaveBeenCalledWith(1)
})
