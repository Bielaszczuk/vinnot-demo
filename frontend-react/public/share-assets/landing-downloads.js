import { detectDownloadPlatform, downloadTarget } from './download-platform.js';
import { bindLandingLanguage } from './landing-language.js';

/** Static landing composition: no API, tracking, install probes or automatic scheme redirects.
 * @param {Document} documentLike
 * @param {import('./download-platform.js').DeviceNavigator | undefined} navigatorLike */
export function bindStoreDownloads(documentLike, navigatorLike) {
  const landing = documentLike.querySelector('[data-download-landing]');
  if (!landing) return;
  const button = landing.querySelector('[data-download-button]');
  const status = landing.querySelector('[data-download-status]');
  const badges = [...landing.querySelectorAll('[data-store]')];
  const platform = detectDownloadPlatform(navigatorLike);
  const target = downloadTarget(platform, {
    ...landing.dataset,
    androidAvailable: landing.dataset.androidAvailable === 'true',
  });
  if (target.kind === 'choose') return;
  status.textContent = target.message;
  if (target.kind === 'store') {
    button.href = target.url;
    for (const badge of badges) {
      if (badge.getAttribute('aria-disabled') !== 'true') badge.href = target.url;
    }
    return;
  }
  button.textContent = target.message;
  for (const action of [button, ...badges]) {
    action.removeAttribute('href');
    action.setAttribute('aria-disabled', 'true');
    action.setAttribute('tabindex', '-1');
  }
}

if (typeof document !== 'undefined') {
  bindLandingLanguage(document, navigator, location);
  bindStoreDownloads(document, navigator);
}
