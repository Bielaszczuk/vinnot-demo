/** Frontend-only rollout toggles; the API enforces its own policy independently. */

/** Facebook remains available in development while production approval is pending. */
export function isFacebookLoginEnabled(): boolean {
  return import.meta.env.VITE_APP_ENV !== 'production'
    && import.meta.env.VITE_FEATURE_FACEBOOK_LOGIN !== 'false'
}

/** UI rollout only; the API independently enforces seller, amount and environment policy. */
export function isEventPaymentsEnabled(): boolean {
  return import.meta.env.VITE_EVENT_PAYMENTS_ENABLED === 'true'
    || (import.meta.env.VITE_APP_ENV !== 'production' && import.meta.env.VITE_EVENT_PAYMENTS_SANDBOX === 'true')
}
