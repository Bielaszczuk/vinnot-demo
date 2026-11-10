import { afterEach, describe, expect, it } from 'vitest'
import { pickDescription, setWineMapperLocale } from './wine.mappers.locale'

describe('wine description locale', () => {
  afterEach(() => setWineMapperLocale('es'))

  it.each(['es', 'es-AR', 'en', 'en-US'])('selects %s with a fallback for absent translations', (locale) => {
    setWineMapperLocale(locale)
    expect(pickDescription('Español', 'English')).toBe(locale.startsWith('en') ? 'English' : 'Español')
    expect(pickDescription('Español', null)).toBe('Español')
    expect(pickDescription(null, 'English')).toBe('English')
    expect(pickDescription()).toBe('')
  })
})
