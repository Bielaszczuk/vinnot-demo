import { describe, it, expect } from 'vitest';
import { publicContentUrl } from './contentLink';
const id = '758a7f04-2678-4b92-8f5a-00272d150318';
describe('public content links', () => {
  it.each(['wines', 'events', 'wine-routes'] as const)('shares a canonical %s URL', kind => {
    expect(publicContentUrl('https://vinnot.com', kind, id.toUpperCase())).toBe(`https://vinnot.com/share/${kind}/${id}`);
    expect(publicContentUrl('https://dev.vinnot.com', kind, id)).toBe(`https://dev.vinnot.com/share/${kind}/${id}`);
  });
  it.each(['../admin', `${id}?token=secret`, '123', '', 'https://evil.test', `${id}/extra`])('rejects invalid identifiers: %s', value => {
    expect(() => publicContentUrl('https://vinnot.com', 'wines', value)).toThrow();
  });
  it.each(['https://evil.test', 'https://vinnot.com.evil.test', 'http://vinnot.com', 'https://vinnot.com/'])('rejects foreign origins', origin => {
    expect(() => publicContentUrl(origin, 'wines', id)).toThrow();
  });
});
