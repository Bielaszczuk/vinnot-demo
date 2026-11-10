import { findPublicPage, publicContentVersion } from "@/domain/public/public-content";
import { useLegalAgreement } from "./useLegalAgreement";

/** Legal reading uses the same published snapshot as acceptance, with an offline information fallback. */
export function usePublicDocument(slug: string) {
  const agreement = useLegalAgreement("registration", undefined, slug === "terms");
  const fallback = findPublicPage(slug);
  const document = agreement.document;
  const localized = (text: string) => ({ es: text, en: text });
  const page = slug === "terms" && document && fallback ? {
    ...fallback, title: localized(document.title), summary: localized(document.summary),
    sections: document.sections.map(section => ({ id: section.id, title: localized(section.title), body: localized(section.body) })),
  } : fallback;
  return { page, version: slug === "terms" && document ? document.version : publicContentVersion,
    termsUnconfirmed: slug === "terms" && !document, retry: agreement.retry };
}
