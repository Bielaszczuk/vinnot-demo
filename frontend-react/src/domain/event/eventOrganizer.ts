import type { EventOrganizer } from './event.types'

/** Whether the organizer has any detail worth showing (name, email or phone). */
export function hasOrganizerDetails(organizer: EventOrganizer): boolean {
  return [organizer.name, organizer.email, organizer.phone].some((value) => !!value?.trim())
}
