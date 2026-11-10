import { afterEach, expect, it } from 'vitest'
import { http } from '@infrastructure/http/http'
import { coverImagesClient } from './coverImages.client'

const originalAdapter = http.defaults.adapter
afterEach(() => { http.defaults.adapter = originalAdapter })

it('keeps the photo binary through Axios request serialization instead of converting FormData to JSON', async () => {
  const file = new File(['image bytes'], 'cover.jpg', { type: 'image/jpeg' })
  const signal = new AbortController().signal
  let sent = false
  http.defaults.adapter = async config => {
    // The adapter observes the real request after Axios applies transformRequest.
    expect(config.data).toBeInstanceOf(FormData)
    expect((config.data as FormData).get('file')).toBe(file)
    expect((config.data as FormData).get('kind')).toBe('EVENT')
    expect(config.signal).toBe(signal)
    sent = true
    return { data: { id: 'cover' }, status: 200, statusText: 'OK', headers: {}, config }
  }
  expect(await coverImagesClient.upload(file, 'EVENT', signal)).toEqual({ id: 'cover' })
  expect(sent).toBe(true)
})
