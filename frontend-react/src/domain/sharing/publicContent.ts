/**
 * Which content has a public page, so a share link opens it instead of the
 * neutral "no longer available" page. Mirrors the server's public page rules.
 */

/**
 * Events are public once published and out of draft. The API says so in `publiclyVisible`
 * (an event cancelled straight from draft never had a public page); without it, any
 * status but draft counts as public.
 */
export function isPublicEvent(event: { status: string; publiclyVisible?: boolean }): boolean {
  if (typeof event.publiclyVisible === 'boolean') return event.publiclyVisible
  return event.status.toUpperCase() !== 'DRAFT'
}

/** Routes are public only while published. */
export function isPublicRoute(route: { isPublished: boolean }): boolean {
  return route.isPublished
}
