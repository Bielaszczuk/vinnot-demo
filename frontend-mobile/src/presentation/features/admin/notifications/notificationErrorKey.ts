import { adminNotificationErrorCode } from "@/application/services/adminNotifications.service";

/** Translation key of a failed notification action: the backend refusal when known, else a generic message. */
export function notificationErrorKey(error: unknown): string {
  const code = adminNotificationErrorCode(error);
  return code ? `admin.notifications.errors.${code}` : "admin.notifications.errors.generic";
}
