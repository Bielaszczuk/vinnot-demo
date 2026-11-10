/**
 * Event domain barrel export
 */

export type {
  Event,
  EventType,
  EventStatus,
  EventLocation,
  EventOrganizer,
  EventFilter,
  EventApprovalMode,
  EventRegistrationStatus,
  EventPaymentStatus,
  EventPaymentMethod,
  EventRegistrationAction,
  EventRegistrationSettings,
  EventRegistration,
  RegisterForEventInput,
  EventDiscoveryResult,
} from './event.types'

export {
  eventTypeSchema,
  eventStatusSchema,
  eventLocationSchema,
  eventOrganizerSchema,
  eventSchema,
  createEventSchema,
  eventFilterSchema,
} from './event.validators'

export type {
  EventInput,
  EventFilterInput,
} from './event.validators'

export {
  mapEventSummaryFromDto,
  mapEventFromDto,
  mapEventRegistrationFromDto,
  mapEventToDto,
} from './event.mappers'

export { hasOrganizerDetails } from './eventOrganizer'
