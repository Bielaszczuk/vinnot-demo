/**
 * Allow-list for URLs that come from the server (winery website, event
 * contact action) before the app hands them to the operating system.
 * Only web, email and phone links are opened; `javascript:`, `file:`,
 * `intent:`, `data:` and custom app schemes are rejected.
 */
const MAX_URL_LENGTH = 2048;
const WEB_URL = /^https?:\/\/[^/?#\s]+/i;
const SCHEME = /^([a-z][a-z0-9+.-]*):/i;

export function isSafeExternalUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_URL_LENGTH) return false;
  if ([...value].some((character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)) {
    return false;
  }
  const scheme = SCHEME.exec(value)?.[1]?.toLowerCase();
  if (scheme === "https" || scheme === "http") return WEB_URL.test(value);
  if (scheme === "mailto" || scheme === "tel") return value.length > scheme.length + 1;
  return false;
}
