/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { brandAssets } from './brandAssets'
import { VinnotBrand } from './VinnotBrand'

describe('native and web brand parity', () => {
  it('keeps wine type artwork identical to native', () => {
    for (const path of Object.values(brandAssets.glasses)) {
      const name = path.split('/').at(-1)!
      expect(readFileSync(resolve(path.replace(/^\//, ''))).equals(
        readFileSync(resolve('../frontend-mobile/assets/images/common', name)),
      )).toBe(true)
    }
  })
  it('ships a small WebP hero and preloads the same resource used by React', () => {
    const hero = readFileSync(resolve('src/shared/assets/home-hero.webp'))
    expect(hero.subarray(0, 4).toString()).toBe('RIFF')
    expect(hero.subarray(8, 12).toString()).toBe('WEBP')
    expect(hero.length).toBeLessThan(350_000)
    const html = new DOMParser().parseFromString(readFileSync('index.html', 'utf8'), 'text/html')
    const preload = html.querySelector('link[rel="preload"][as="image"]')
    expect(preload?.getAttribute('href')).toBe(brandAssets.hero)
    expect(preload?.getAttribute('fetchpriority')).toBe('high')
  })
  it('self-hosts every Poppins weight as WOFF2 with font-display swap', () => {
    const css = readFileSync('src/shared/assets/styles/globals.css', 'utf8')
    const faces = css.match(/@font-face\s*{[^}]*}/g) ?? []
    expect(faces.map((face) => face.match(/font-weight:\s*(\d+)/)?.[1])).toEqual(['400', '500', '600', '700'])
    for (const face of faces) {
      expect(face).toContain('font-display: swap')
      const url = face.match(/url\('([^']+)'\)\s*format\('woff2'\)/)?.[1]
      expect(url, face).toMatch(/^\/fonts\/poppins\/Poppins_\w+\.woff2$/)
      const font = readFileSync(resolve('public' + url))
      expect(font.subarray(0, 4).toString()).toBe('wOF2')
      expect(font.length).toBeLessThan(60_000)
    }
    expect(css).not.toMatch(/\.ttf|truetype/)
  })
  it('uses matching lightweight logo resources and exposes the brand name', () => {
    for (const path of [brandAssets.mark, brandAssets.wordmark]) {
      const name = path.split('/').at(-1)!
      const resource = readFileSync(resolve('public' + path))
      expect(resource.equals(readFileSync(resolve('../frontend-mobile/assets/brand', name)))).toBe(true)
      expect(resource.length).toBeLessThan(30_000)
    }
    const { getAllByRole, container } = render(<><VinnotBrand /><VinnotBrand compact /></>)
    expect(getAllByRole('img', { name: 'Vinnot' })).toHaveLength(2)
    expect((container.querySelector('span[aria-hidden]') as HTMLElement).style.backgroundColor.toLowerCase()).toBe('currentcolor')
  })
})
