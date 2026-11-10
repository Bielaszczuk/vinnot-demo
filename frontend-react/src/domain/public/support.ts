export interface SupportMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
}
/** Language of the requester's acknowledgement email. */
export type SupportLanguage = "es" | "en";
export interface SupportSubmission extends SupportMessage {
  requestId: string;
  language: SupportLanguage;
}
export function isSupportMessageValid(value: SupportMessage): boolean {
  return (
    value.name.trim().length > 0 &&
    value.name.length <= 100 &&
    ![value.name, value.email, value.message].some((field) =>
      field.includes("\u0000"),
    ) &&
    !/[\r\n]/.test(value.name) &&
    value.email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) &&
    [
      "general",
      "support",
      "privacy",
      "report",
      "appeal",
      "partnership",
      "feedback",
      "other",
    ].includes(value.subject) &&
    value.message.trim().length > 0 &&
    value.message.length <= 4000
  );
}

/** Display reference only; request identity and idempotency always use the full UUID. */
export function formatSupportReference(requestId: string): string {
  return /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(requestId)
    ? `VIN-${requestId.slice(-12).toUpperCase()}`
    : requestId;
}
