/** Bounds untrusted OS links before Expo Router's permissive query decoder runs. */
export function safeNativeIntent(path: unknown): string {
  if (typeof path !== 'string' || path.length > 4096) return '/';
  try {
    const decoded = decodeURIComponent(path);
    if ([...decoded].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return '/';
    // Translate public share URLs before the auth shell remembers the destination.
    let target = path;
    const nativeContent = /^vinnot:\/\/(wines|events|wine-routes)\/(.+)$/i.exec(path);
    if (nativeContent?.[1] && nativeContent[2]) target = `/share/${nativeContent[1]}/${nativeContent[2].split('?')[0]}`;
    if (/^https?:\/\//i.test(path)) {
      const url = new URL(path);
      if (url.pathname === '/share' || url.pathname.startsWith('/share/')) {
        if (url.protocol !== 'https:' || !['vinnot.com', 'dev.vinnot.com'].includes(url.hostname)
          || url.username || url.password || url.port) return '/';
        target = url.pathname;
      }
    }
    if (/^\/share\/?(?:\?[^#]*)?$/.test(target)) return '/';
    if (target.startsWith('/share/')) {
      const match = /^\/share\/(wines|events|wine-routes)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\?[^#]*)?$/i.exec(target);
      if (!match || !match[1] || !match[2]) return '/';
      const resource = match[1].toLowerCase() === 'wine-routes' ? 'routes' : match[1].toLowerCase();
      return `/${resource}/${match[2].toLowerCase()}`;
    }
    return path || '/';
  } catch {
    return '/';
  }
}
