import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { usePendingImageCrop } from './usePendingImageCrop'

const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL }
let created = 0

beforeEach(() => {
  created = 0
  URL.createObjectURL = vi.fn(() => `blob:${++created}`)
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  URL.createObjectURL = original.create
  URL.revokeObjectURL = original.revoke
})

it('keeps the picked photo with a preview URL and frees every URL it no longer needs', () => {
  const first = new File(['a'], 'a.png', { type: 'image/png' })
  const second = new File(['b'], 'b.png', { type: 'image/png' })
  const { result, unmount } = renderHook(usePendingImageCrop)
  expect(result.current.pending).toBeNull()

  act(() => result.current.open(first))
  expect(result.current.pending).toEqual({ file: first, url: 'blob:1' })
  act(() => result.current.open(second))
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1')
  expect(result.current.pending).toEqual({ file: second, url: 'blob:2' })

  act(() => result.current.close())
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:2')
  expect(result.current.pending).toBeNull()

  act(() => result.current.open(first))
  unmount()
  expect(URL.revokeObjectURL).toHaveBeenLastCalledWith('blob:3')
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3)
})

it('frees nothing when unmounted with no photo open', () => {
  renderHook(usePendingImageCrop).unmount()
  expect(URL.revokeObjectURL).not.toHaveBeenCalled()
})
