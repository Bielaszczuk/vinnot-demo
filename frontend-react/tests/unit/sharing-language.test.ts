import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindLandingLanguage, englishLandingUrl } from '../../public/share-assets/landing-language.js';

const page = 'https://vinnot.com/share/wines/3f2b6a8e-1c2d-4e5f-8a9b-0c1d2e3f4a5b';

afterEach(() => { document.documentElement.lang = ''; });

describe('landing language policy', () => {
  it.each([['en-US'], ['en'], ['EN-gb']])('sends a %s device from the Spanish default to the English page', (language) => {
    expect(englishLandingUrl(page, 'es', language)).toBe(`${page}?lang=en`);
  });
  it('keeps the fragment when switching to English', () => {
    expect(englishLandingUrl(`${page}#download-options`, 'es', 'en-US')).toBe(`${page}?lang=en#download-options`);
  });
  it.each([['es-AR'], ['pt-BR'], [''], [undefined]])('keeps the Spanish page for a %s device', (language) => {
    expect(englishLandingUrl(page, 'es', language)).toBeNull();
  });
  it.each([[`${page}?lang=es`], [`${page}?lang=en`], ['https://vinnot.com/share/en']])(
    'respects an explicit language choice in %s', (href) => {
      expect(englishLandingUrl(href, 'es', 'en-US')).toBeNull();
    });
  it('leaves an already English page alone', () => {
    expect(englishLandingUrl(page, 'en', 'en-US')).toBeNull();
  });
});

describe('landing language binding', () => {
  it('replaces the location without adding a history entry', () => {
    document.documentElement.lang = 'es';
    const replace = vi.fn();
    bindLandingLanguage(document, { language: 'en-US' }, { href: page, replace });
    expect(replace).toHaveBeenCalledWith(`${page}?lang=en`);
  });
  it('does nothing when the device language matches the page', () => {
    document.documentElement.lang = 'es';
    const replace = vi.fn();
    bindLandingLanguage(document, { language: 'es-AR' }, { href: page, replace });
    expect(replace).not.toHaveBeenCalled();
  });
});
