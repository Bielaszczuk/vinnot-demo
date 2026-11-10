type Translate = (key: string, options?: { defaultValue?: string }) => string;

/**
 * Text for a submission's review reason: the translated automatic reason when the backend sent a code,
 * the moderator's own words otherwise. An unknown code falls back to the stored text.
 */
export function submissionReasonText(
  t: Translate,
  submission: { reasonCode: string | null; reviewReason: string | null },
): string | null {
  if (submission.reasonCode) {
    return t(`submissionReasons.${submission.reasonCode}`, { defaultValue: submission.reviewReason ?? "" }) || null;
  }
  return submission.reviewReason;
}
