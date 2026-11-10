import http from "@infrastructure/http/http";
import type { TermsDocumentDto as TermsDocument, TermsStatusDto as TermsStatus, TermsSelectionDto as TermsSelection } from "../dto/legal.dto";
export const legalClient = {
  async current(locale: string): Promise<TermsDocument> {
    return (await http.get<TermsDocument>("/legal/terms/current", { params: { locale } })).data;
  },
  async status(locale: string): Promise<TermsStatus> {
    return (await http.get<TermsStatus>("/legal/acceptance", { params: { locale } })).data;
  },
  async accept(selection: TermsSelection): Promise<TermsStatus> {
    return (await http.post<TermsStatus>("/legal/acceptance", selection)).data;
  },
};
