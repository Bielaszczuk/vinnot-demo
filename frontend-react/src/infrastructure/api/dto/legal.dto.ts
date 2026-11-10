/** Contractual consent is independent of cookies, marketing and device permissions. */
export interface TermsDocumentDto {
  version: string;
  acceptanceRevision: string;
  locale: "es" | "en";
  contentHash: string;
  title: string;
  summary: string;
  sections: { id: string; title: string; body: string }[];
}
export interface TermsSelectionDto {
  version: string;
  locale: "es" | "en";
  contentHash: string;
  accepted: boolean;
}
export interface TermsStatusDto {
  required: boolean;
  acceptedAt: string | null;
  document: TermsDocumentDto;
  requiredFrom?: string | null;
}
