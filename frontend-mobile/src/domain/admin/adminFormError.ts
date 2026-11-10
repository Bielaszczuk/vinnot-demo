/**
 * Maps backend error codes of catalog administration (GlobalExceptionHandler) to message
 * keys, so a failed save says what went wrong instead of a generic error.
 */
export function adminFormErrorKey(code: string | undefined, fallback: string): string {
  switch (code) {
    case "DUPLICATE_ENTRY":
      return "forms.errors.duplicate";
    case "CONCURRENT_UPDATE":
      return "forms.errors.concurrentUpdate";
    case "NOT_FOUND":
      return "forms.errors.notFound";
    case "FORBIDDEN":
      return "forms.errors.forbidden";
    case "E1001":
    case "INVALID_REQUEST":
      return "forms.errors.invalid";
    default:
      return fallback;
  }
}
