package com.vinnot.legal.application.port.in;
import com.vinnot.legal.domain.model.TermsDocument;
import com.vinnot.legal.domain.model.TermsSelection;
import com.vinnot.legal.domain.model.TermsStatus;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
public interface LegalAgreementUseCase {
    TermsDocument current(String locale);
    TermsDocument version(String version, String locale);
    TermsStatus status(UUID userId, String locale);
    TermsStatus accept(UUID userId, TermsSelection selection);
    void validateRegistration(TermsSelection selection);
    void recordRegistration(UUID userId, TermsSelection selection);
    boolean enforcementEnabled();
    /** When the document must be accepted by those who accepted an earlier revision; empty when it is required at once. */
    Optional<Instant> requiredFrom(TermsDocument document);
}
