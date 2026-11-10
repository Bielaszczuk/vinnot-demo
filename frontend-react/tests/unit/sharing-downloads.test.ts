import { afterEach, describe, expect, it } from 'vitest';
import { detectDownloadPlatform, downloadTarget } from '../../public/share-assets/download-platform.js';
import { bindStoreDownloads } from '../../public/share-assets/landing-downloads.js';

const stores = {
  iosUrl: 'https://apps.apple.com/app/vinnot/id6817992780',
  androidUrl: 'https://play.google.com/store/apps/details?id=com.vinnot.app',
  androidAvailable: true,
  iosMessage: 'Gratis en App Store', androidMessage: 'Gratis en Google Play',
  androidPending: 'Próximamente en Google Play',
};

afterEach(() => { document.body.innerHTML = ''; });

describe('download platform adapter', () => {
  it.each([
    [{ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)' }, 'ios'],
    [{ userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0)' }, 'ios'],
    [{ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', maxTouchPoints: 5 }, 'ios'],
    [{ userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-A315G)' }, 'android'],
    [{ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', maxTouchPoints: 0 }, 'other'],
    [{ userAgent: 'Mozilla/5.0 (Windows NT 10.0)' }, 'other'],
    [undefined, 'other'],
  ] as const)('selects a store from the device without detecting installed apps', (navigatorLike, expected) => {
    expect(detectDownloadPlatform(navigatorLike)).toBe(expected);
  });
  it('uses the corresponding store or the explicit unavailable/desktop fallback', () => {
    expect(downloadTarget('ios', stores)).toEqual({ kind: 'store', url: stores.iosUrl, message: stores.iosMessage });
    expect(downloadTarget('android', stores)).toEqual({ kind: 'store', url: stores.androidUrl, message: stores.androidMessage });
    expect(downloadTarget('android', { ...stores, androidAvailable: false })).toEqual({ kind: 'unavailable', message: stores.androidPending });
    expect(downloadTarget('other', stores)).toEqual({ kind: 'choose', url: '#download-options' });
  });
});

function landing(available = true) {
  document.body.innerHTML = `<section data-download-landing data-ios-url="${stores.iosUrl}"
    data-android-url="${stores.androidUrl}" data-android-available="${available}"
    data-ios-message="${stores.iosMessage}" data-android-message="${stores.androidMessage}"
    data-android-pending="${stores.androidPending}">
    <a data-download-button href="#download-options">Descargar Vinnot</a><p data-download-status>Descargala gratis</p>
    <a data-store="ios" href="${stores.iosUrl}">App Store</a>
    <a data-store="android" href="${stores.androidUrl}" aria-disabled="${!available}">Google Play</a>
  </section><a class="web-link" href="https://vinnot.com/">Continuar en la web</a>`;
}

describe('static download presentation', () => {
  it.each([['iPhone', stores.iosUrl], ['Android 12', stores.androidUrl]])(
    'main action and either available badge open the device store on %s', (userAgent, url) => {
      landing();
      bindStoreDownloads(document, { userAgent });
      for (const selector of ['[data-download-button]', '[data-store="ios"]', '[data-store="android"]']) {
        expect(document.querySelector(selector)?.getAttribute('href')).toBe(url);
      }
      expect(document.querySelector('.web-link')?.getAttribute('href')).toBe('https://vinnot.com/');
    });
  it('never sends an Android visitor to App Store while Play is unavailable', () => {
    landing(false);
    bindStoreDownloads(document, { userAgent: 'Android 12' });
    for (const action of document.querySelectorAll('[data-download-button], [data-store]')) {
      expect(action.hasAttribute('href')).toBe(false);
      expect(action.getAttribute('aria-disabled')).toBe('true');
      expect(action.getAttribute('tabindex')).toBe('-1');
    }
    expect(document.querySelector('[data-download-button]')?.textContent).toBe(stores.androidPending);
    expect(document.querySelector('[data-download-status]')?.textContent).toBe(stores.androidPending);
  });
  it('keeps the unavailable Play badge disabled for iOS visitors', () => {
    landing(false);
    bindStoreDownloads(document, { userAgent: 'iPhone' });
    expect(document.querySelector('[data-download-button]')?.getAttribute('href')).toBe(stores.iosUrl);
    expect(document.querySelector('[data-store="android"]')?.getAttribute('aria-disabled')).toBe('true');
    expect(document.querySelector('[data-download-status]')?.textContent).toBe(stores.iosMessage);
  });
  it('leaves explicit store choice available on desktop and with no client script', () => {
    landing();
    bindStoreDownloads(document, { userAgent: 'Windows' });
    expect(document.querySelector('[data-download-button]')?.getAttribute('href')).toBe('#download-options');
    expect(document.querySelector('[data-store="ios"]')?.getAttribute('href')).toBe(stores.iosUrl);
    expect(document.querySelector('[data-store="android"]')?.getAttribute('href')).toBe(stores.androidUrl);
    expect(document.querySelector('[data-download-status]')?.textContent).toBe('Descargala gratis');
  });
  it('can be loaded on a page without a download section', () => {
    expect(() => bindStoreDownloads(document, { userAgent: 'iPhone' })).not.toThrow();
  });
});
