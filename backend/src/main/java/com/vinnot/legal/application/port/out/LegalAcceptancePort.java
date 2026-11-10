package com.vinnot.legal.application.port.out;
import com.vinnot.legal.domain.model.TermsDocument;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
public interface LegalAcceptancePort {
    Optional<Instant> acceptedAt(UUID userId, String revision);
    /** When the user last accepted a terms revision other than {@code revision}, if they ever did. */
    Optional<Instant> latestAcceptanceOfOtherRevision(UUID userId, String revision);
    void accept(UUID userId, TermsDocument document);
}
