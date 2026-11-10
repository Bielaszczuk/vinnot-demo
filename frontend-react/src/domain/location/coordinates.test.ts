import { describe, expect, it } from 'vitest';
import { hasCoordinates } from './coordinates';
describe('map coordinates', () => {
  it('accepts equator, prime meridian and geographic boundaries', () => {
    for (const [latitude, longitude] of [[0, 0], [0, -68], [-34, 0], [90, 180], [-90, -180]]) {
      expect(hasCoordinates({ latitude, longitude })).toBe(true);
    }
  });
  it('does not turn missing or invalid positions into a map at zero', () => {
    for (const location of [{}, { latitude: null, longitude: null }, { latitude: 0 }, { latitude: NaN, longitude: 1 }, { latitude: 91, longitude: 0 }, { latitude: 0, longitude: 181 }, { latitude: -91, longitude: 0 }, { latitude: 0, longitude: -181 }, { latitude: 1, longitude: Infinity }]) {
      expect(hasCoordinates(location)).toBe(false);
    }
  });
});
