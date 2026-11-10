import type { PartnerEvent } from "@/domain/partner/partner.types";
import { formatDate as formatSharedDate } from "@/shared/i18n/format";
import { vinnotColors } from "@/shared/theme/vinnotTheme";

export const PAGE_SIZE = 20;
export {
  EVENT_TYPES,
  EVENT_STATUSES,
  APPROVAL_MODES,
  nullable,
  nullableIso,
  numberOrNull,
  toIso,
  toDateInput,
  toDefaultValues as toPartnerEventFormValues,
} from "../event/EventEditor.contracts";
export type { EventSheetFormValues as PartnerEventFormValues } from "../event/EventEditor.contracts";

/** An event date for the organizer list, in the app language; an unreadable value is shown as it is. */
export function formatDate(value: string | undefined, language: string | null | undefined) {
  return formatSharedDate(value, language);
}

export function statusStyle(status: PartnerEvent["status"]) {
  switch (status.toUpperCase()) {
    case "PUBLISHED":
      return {
        bg: vinnotColors.successSoft,
        color: vinnotColors.success,
        dot: vinnotColors.success,
      };
    case "CANCELLED":
      return {
        bg: vinnotColors.dangerSoft,
        color: vinnotColors.danger,
        dot: vinnotColors.danger,
      };
    case "COMPLETED":
      return {
        bg: vinnotColors.canvasMuted,
        color: vinnotColors.muted,
        dot: vinnotColors.borderStrong,
      };
    default:
      return {
        bg: vinnotColors.brandSoft,
        color: vinnotColors.brandDeep,
        dot: vinnotColors.brand,
      };
  }
}
