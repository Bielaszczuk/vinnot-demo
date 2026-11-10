// @ts-check
/** @typedef {{ userAgent?: string, maxTouchPoints?: number }} DeviceNavigator */
/** @typedef {'ios' | 'android' | 'other'} DownloadPlatform */
/** @typedef {{ iosUrl: string, androidUrl: string, androidAvailable: boolean,
 * iosMessage: string, androidMessage: string, androidPending: string }} DownloadStores */
/** @typedef {{ kind: 'store', url: string, message: string }
 * | { kind: 'unavailable', message: string } | { kind: 'choose', url: string }} DownloadTarget */

/** Browser capability adapter. Detection selects a store, never infers app installation.
 * @param {DeviceNavigator | undefined} navigatorLike
 * @returns {DownloadPlatform} */
export function detectDownloadPlatform(navigatorLike) {
  const agent = navigatorLike?.userAgent ?? '';
  if (/android/i.test(agent)) return 'android';
  if (/iphone|ipad|ipod/i.test(agent)
      || /macintosh/i.test(agent) && (navigatorLike?.maxTouchPoints ?? 0) > 1) return 'ios';
  return 'other';
}

/** Pure store-routing policy shared by the main action and the store badges.
 * @param {DownloadPlatform} platform
 * @param {DownloadStores} stores
 * @returns {DownloadTarget} */
export function downloadTarget(platform, stores) {
  if (platform === 'ios') return { kind: 'store', url: stores.iosUrl, message: stores.iosMessage };
  if (platform === 'android') {
    return stores.androidAvailable
      ? { kind: 'store', url: stores.androidUrl, message: stores.androidMessage }
      : { kind: 'unavailable', message: stores.androidPending };
  }
  return { kind: 'choose', url: '#download-options' };
}
