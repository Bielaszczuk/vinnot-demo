package com.vinnot.legal.application.port.out;
import com.vinnot.legal.domain.model.TermsDocument;
import java.time.Instant;
import java.util.Optional;
public interface LegalDocumentPort {
    TermsDocument current(String locale);
    TermsDocument version(String version, String locale);
    boolean enforcementEnabled();
    /** When the document's acceptance revision replaced an earlier one; empty for the first revision ever published. */
    Optional<Instant> revisionChangedAt(TermsDocument document);
}
