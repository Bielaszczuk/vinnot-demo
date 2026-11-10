// @ts-check
/** @typedef {{ language?: string }} LanguageNavigator */
/** @typedef {{ href: string, replace: (url: string) => void }} LandingLocation */

/** The CDN forwards no viewer headers, so the server renders Spanish unless the URL asks for
 * English. Same rule as the mobile app: English only for an English device language.
 * An explicit `?lang=` or `/en` choice always wins.
 * @param {string} href
 * @param {string} pageLanguage
 * @param {string | undefined} deviceLanguage
 * @returns {string | null} the English URL to load, or null to stay */
export function englishLandingUrl(href, pageLanguage, deviceLanguage) {
  if (pageLanguage !== 'es' || !deviceLanguage?.toLowerCase().startsWith('en')) return null;
  const url = new URL(href);
  if (url.searchParams.has('lang') || url.pathname.endsWith('/en')) return null;
  url.searchParams.set('lang', 'en');
  return url.toString();
}

/** @param {Document} documentLike
 * @param {LanguageNavigator | undefined} navigatorLike
 * @param {LandingLocation} locationLike */
export function bindLandingLanguage(documentLike, navigatorLike, locationLike) {
  const target = englishLandingUrl(locationLike.href, documentLike.documentElement.lang, navigatorLike?.language);
  if (target) locationLike.replace(target);
}
