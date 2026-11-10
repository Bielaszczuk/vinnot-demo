/** Contractual consent is independent of cookies, marketing and device permissions. */
export interface TermsDocument {
  version: string;
  acceptanceRevision: string;
  locale: "es" | "en";
  contentHash: string;
  title: string;
  summary: string;
  sections: { id: string; title: string; body: string }[];
}
export interface TermsSelection {
  version: string;
  locale: "es" | "en";
  contentHash: string;
  accepted: boolean;
}
export interface TermsStatus {
  required: boolean;
  acceptedAt: string | null;
  document: TermsDocument;
  /** Set while a new revision is in its notice period: the app keeps working until this date. */
  requiredFrom?: string | null;
}
export function selectTerms(document: TermsDocument): TermsSelection {
  return { version: document.version, locale: document.locale, contentHash: document.contentHash, accepted: true };
}
