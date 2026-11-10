import { canShareEvent, canShareRoute } from './shareability';

describe('shareability', () => {
  it('offers sharing only for routes with a public page', () => {
    expect(canShareRoute({ isPublished: true })).toBe(true);
    expect(canShareRoute({ isPublished: false })).toBe(false);
  });

  it.each(['PUBLISHED', 'SOLD_OUT', 'COMPLETED', 'CANCELLED'] as const)('shares a %s event', status => {
    expect(canShareEvent({ status })).toBe(true);
  });

  it('does not share a draft event', () => {
    expect(canShareEvent({ status: 'DRAFT' })).toBe(false);
  });

  it('trusts the API when it says whether the event was ever public', () => {
    expect(canShareEvent({ status: 'CANCELLED', publiclyVisible: false })).toBe(false);
    expect(canShareEvent({ status: 'CANCELLED', publiclyVisible: true })).toBe(true);
  });
});
