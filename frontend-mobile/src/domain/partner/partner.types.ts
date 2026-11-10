/**
 * Partner domain types.
 * @contract: keep in sync with frontend-react/src/domain/partner/partner.types.ts
 */

export type {
  ManagedEvent as PartnerEvent,
  EventEditorInput as PartnerEventPayload,
} from "../event/eventManagement.types";

export interface PartnerPaginatedResult<T> {
  items: T[];
  totalItems: number;
}
