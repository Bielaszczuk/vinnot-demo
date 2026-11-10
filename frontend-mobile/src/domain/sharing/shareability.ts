import type { EventStatus } from '@/domain/event/event.types';

/**
 * Whether content has a public page, so a share link opens it instead of the
 * neutral "no longer available" page. Mirrors the backend shared-content rules:
 * routes need PUBLISHED (`isPublished`), events must not be a draft.
 */
export function canShareRoute(route: { isPublished: boolean }): boolean {
  return route.isPublished;
}

/**
 * The API says whether the event has a public page in `publiclyVisible` (an event cancelled
 * straight from draft never had one); without it, any status but draft counts as public.
 */
export function canShareEvent(event: { status: EventStatus; publiclyVisible?: boolean }): boolean {
  if (typeof event.publiclyVisible === 'boolean') return event.publiclyVisible;
  return event.status !== 'DRAFT';
}
