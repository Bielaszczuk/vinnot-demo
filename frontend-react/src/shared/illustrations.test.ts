/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { illustrations } from './illustrations'

describe('bundled illustration contract', () => {
  it('ships transparent, bounded WebP resources identical to the mobile assets', () => {
    for (const url of Object.values(illustrations)) {
      const resource = readFileSync(resolve(url.replace(/^\//, '')))
      const name = url.split('/').at(-1)!
      expect(resource.equals(readFileSync(resolve('../frontend-mobile/assets/images/illustrations', name)))).toBe(true)
      expect(resource.length).toBeLessThan(260_000)
      expect(resource.subarray(0, 4).toString()).toBe('RIFF')
      expect(resource.subarray(8, 12).toString()).toBe('WEBP')
      // Extended WebP's alpha feature bit must survive conversion.
      expect(resource.subarray(12, 16).toString()).toBe('VP8X')
      expect(resource[20]! & 0x10).toBe(0x10)
    }
  })
})
