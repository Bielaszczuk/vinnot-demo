/** Validate external navigation before exposing a checkout link to presentation. */
export function mapSandboxCheckout(response: { attemptId: string; checkoutUrl: string | null }) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(response.attemptId)) {
    throw new Error("Invalid checkout attempt");
  }
  if (response.checkoutUrl === null) return response;
  const url = new URL(response.checkoutUrl);
  if (url.origin !== "https://www.mercadopago.com.ar" || url.pathname !== "/checkout/v1/redirect"
      || url.username || url.password || url.hash) throw new Error("Invalid sandbox checkout URL");
  return { attemptId: response.attemptId, checkoutUrl: url.href };
}
