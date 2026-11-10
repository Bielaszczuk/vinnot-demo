import { mapSandboxCheckout } from './eventCheckout';
const attemptId = 'f0da7948-e767-458d-9681-43a38ed9d6c9';
describe('sandbox checkout navigation', () => {
  it('accepts pending and allowlisted provider responses', () => {
    expect(mapSandboxCheckout({ attemptId, checkoutUrl: null })).toEqual({ attemptId, checkoutUrl: null });
    const checkoutUrl = 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=test';
    expect(mapSandboxCheckout({ attemptId, checkoutUrl }).checkoutUrl).toBe(checkoutUrl);
  });
  it.each(['https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=test', 'https://example.com/checkout/v1/redirect', 'http://www.mercadopago.com.ar/checkout/v1/redirect',
    'https://www.mercadopago.com.ar/other', 'https://u:p@www.mercadopago.com.ar/checkout/v1/redirect',
    'https://www.mercadopago.com.ar/checkout/v1/redirect#bad', 'javascript:alert(1)'])('rejects unsafe provider URL %s', checkoutUrl => {
    expect(() => mapSandboxCheckout({ attemptId, checkoutUrl })).toThrow();
  });
  it('rejects malformed attempts', () => {
    expect(() => mapSandboxCheckout({ attemptId: 'wrong', checkoutUrl: null })).toThrow();
  });
});
