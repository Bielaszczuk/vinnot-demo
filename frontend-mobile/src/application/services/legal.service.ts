import { legalClient } from "@/infrastructure/api/clients/legal.client";
import { selectTerms, type TermsDocument, type TermsStatus } from "@/domain/legal/agreement";

export const legalService = {
  async current(locale: "es" | "en"): Promise<TermsDocument> {
    return documentFrom(await legalClient.current(locale));
  },
  async status(locale: "es" | "en"): Promise<TermsStatus> {
    return statusFrom(await legalClient.status(locale));
  },
  async accept(document: TermsDocument): Promise<TermsStatus> {
    return statusFrom(await legalClient.accept(selectTerms(document)));
  },
};

function documentFrom(value: TermsDocument): TermsDocument {
  if (!value || !value.version || !value.acceptanceRevision || !value.title || !value.summary
      || !["es", "en"].includes(value.locale) || !/^[a-f0-9]{64}$/.test(value.contentHash)
      || !Array.isArray(value.sections) || !value.sections.length
      || value.sections.some(section => !section.id || !section.title || !section.body)) {
    throw new Error("INVALID_TERMS_DOCUMENT");
  }
  return { ...value, sections: value.sections.map(section => ({ ...section })) };
}
/** Not required means accepted, or a new revision still in its notice period; anything else keeps the gate closed. */
function statusFrom(value: TermsStatus): TermsStatus {
  if (!value || typeof value.required !== "boolean"
      || (!value.required && !value.acceptedAt && !value.requiredFrom)) {
    throw new Error("INVALID_TERMS_STATUS");
  }
  return {
    required: value.required,
    acceptedAt: value.acceptedAt,
    document: documentFrom(value.document),
    ...(value.requiredFrom ? { requiredFrom: value.requiredFrom } : {}),
  };
}
