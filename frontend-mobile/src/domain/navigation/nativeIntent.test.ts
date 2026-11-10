import { safeNativeIntent } from './nativeIntent';

describe('OS link boundary', () => {
  it.each([
    '/wines/abc', 'vinnot://reset-password?token=opaque_token',
    'https://vinnot.com/verify-email?token=opaque', 'exp://192.168.1.2:8081/--/wines',
    'vinnot://wines?q=Vi%C3%B1a%20del%20Mar', '/search?q=100%25',
  ])('preserves valid links without rewriting credentials: %s', path => {
    expect(safeNativeIntent(path)).toBe(path);
  });
  it.each([null, undefined, 5, '', '%', '%FF', '%E0%A4%A', '%'.repeat(50000),
    '/?q=' + 'x'.repeat(4096), '/%00', '/%0A', '/%7F'])('safely rejects malformed or oversized input', path => {
    expect(safeNativeIntent(path)).toBe('/');
  });
});

const contentId = '758a7f04-2678-4b92-8f5a-00272d150318';
describe('shared content navigation', () => {
  it.each(['/share', '/share/', '/share?lang=en', '/share/?lang=es',
    'https://vinnot.com/share', 'https://vinnot.com/share/?lang=en', 'https://dev.vinnot.com/share'])(
    'opens the download QR in the app home: %s', path => {
      expect(safeNativeIntent(path)).toBe('/');
    });
  it.each(['https://evil.test/share', 'http://vinnot.com/share',
    'https://user:pass@vinnot.com/share', 'https://vinnot.com:444/share', '/share/admin'])(
    'rejects forged or unsupported download links: %s', path => {
      expect(safeNativeIntent(path)).toBe('/');
    });
  it.each([['wines', 'wines'], ['events', 'events'], ['wine-routes', 'routes']])('opens %s in its native destination', (kind, destination) => {
    expect(safeNativeIntent(`https://vinnot.com/share/${kind}/${contentId}?lang=en`)).toBe(`/${destination}/${contentId}`);
    expect(safeNativeIntent(`/share/${kind}/${contentId}`)).toBe(`/${destination}/${contentId}`);
    expect(safeNativeIntent(`vinnot://${kind}/${contentId}`)).toBe(`/${destination}/${contentId}`);
    expect(safeNativeIntent(`https://dev.vinnot.com/share/${kind}/${contentId}`)).toBe(`/${destination}/${contentId}`);
  });
  it.each(['https://evil.test/share/wines/', 'http://vinnot.com/share/wines/', 'https://vinnot.com.evil.test/share/wines/', '/share/unknown/', '/share/wines/../', '/share/wines/invalid-'])('bounds invalid shared paths', prefix => {
    expect(safeNativeIntent(prefix + contentId)).toBe('/');
  });
});
