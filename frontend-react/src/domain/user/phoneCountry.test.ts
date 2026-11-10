import { it, expect } from "vitest";
import { splitContactPhone, joinContactPhone } from './phoneCountry';
it('prefills an Argentine mobile without duplicating country or mobile codes', () => {
 expect(splitContactPhone('+54 9 11 2345-6789')).toEqual({ country: 'AR', national: '1123456789' });
 expect(joinContactPhone('AR', '11 2345-6789')).toBe('+5491123456789');
 expect(joinContactPhone('AR', '91123456789')).toBe('+5491123456789');
});
it('preserves international numbers and never silently assigns Argentina to an unknown country', () => {
 expect(splitContactPhone('+1 (202) 555-0123')).toEqual({ country: 'US/CA', national: '2025550123' });
 expect(splitContactPhone('+819012345678')).toEqual({ country: 'OTHER', national: '+819012345678' });
 expect(joinContactPhone('OTHER', '+81 9012345678')).toBe('+819012345678');
 expect(joinContactPhone('CL', '912345678')).toBe('+56912345678');
 expect(joinContactPhone('AR', '')).toBe('');
 expect(splitContactPhone('')).toEqual({ country: 'AR', national: '' });
});
