package com.vinnot.legal.application.service;
import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.legal.application.port.out.LegalAcceptancePort;
import com.vinnot.legal.application.port.out.LegalDocumentPort;
import com.vinnot.legal.domain.model.TermsDocument;
import com.vinnot.legal.domain.model.TermsSelection;
import com.vinnot.legal.domain.model.TermsStatus;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.Objects;

@Service
public class LegalAgreementService implements LegalAgreementUseCase {
    private final LegalDocumentPort documents;
    private final LegalAcceptancePort acceptances;
    private final Duration noticePeriod;
    private final Clock clock;
    @Autowired
    public LegalAgreementService(LegalDocumentPort documents, LegalAcceptancePort acceptances,
            @Value("${app.legal.notice-period:P30D}") Duration noticePeriod) {
        this(documents, acceptances, noticePeriod, Clock.systemUTC());
    }
    LegalAgreementService(LegalDocumentPort documents, LegalAcceptancePort acceptances, Duration noticePeriod, Clock clock) {
        this.documents = documents;
        this.acceptances = acceptances;
        this.noticePeriod = noticePeriod;
        this.clock = clock;
    }
    @Override public boolean enforcementEnabled() { return documents.enforcementEnabled(); }
    @Override public TermsDocument current(String locale) { return documents.current(locale(locale)); }
    @Override public TermsDocument version(String version, String locale) { return documents.version(version, locale(locale)); }
    /**
     * A new acceptance revision gives whoever accepted an earlier one a notice period before it is required (#309); the
     * first revision, and anyone who never accepted terms, are required at once. During the notice period the earlier
     * acceptance still stands and is reported as {@code acceptedAt}, so clients released before the notice period
     * existed keep letting the person in.
     */
    @Override public TermsStatus status(UUID userId, String locale) {
        TermsDocument document = current(locale);
        var accepted = acceptances.acceptedAt(userId, document.acceptanceRevision());
        if (accepted.isPresent()) {
            return new TermsStatus(false, accepted.get(), document);
        }
        Optional<Instant> earlier = acceptances.latestAcceptanceOfOtherRevision(userId, document.acceptanceRevision());
        Optional<Instant> requiredFrom = earlier.flatMap(at -> requiredFrom(document));
        boolean required = requiredFrom.map(from -> !clock.instant().isBefore(from)).orElse(true);
        return new TermsStatus(required, required ? null : earlier.orElseThrow(), document, requiredFrom.orElse(null));
    }
    @Override public Optional<Instant> requiredFrom(TermsDocument document) {
        return documents.revisionChangedAt(document).map(changedAt -> changedAt.plus(noticePeriod));
    }
    @Override
    @Transactional
    public TermsStatus accept(UUID userId, TermsSelection selection) {
        TermsDocument document = validate(selection);
        acceptances.accept(userId, document);
        return status(userId, document.locale());
    }
    @Override public void validateRegistration(TermsSelection selection) {
        if (Objects.nonNull(selection) || enforcementEnabled()) {
            validate(selection);
        }
    }
    @Override public void recordRegistration(UUID userId, TermsSelection selection) {
        if (Objects.nonNull(selection)) {
            accept(userId, selection);
        }
    }
    private TermsDocument validate(TermsSelection selection) {
        if (Objects.isNull(selection) || !selection.accepted()) {
            throw new BusinessRuleViolationException("TERMS_ACCEPTANCE_REQUIRED", "Explicit terms acceptance is required");
        }
        TermsDocument document = current(selection.locale());
        if (!document.version().equals(selection.version()) || !document.contentHash().equals(selection.contentHash())) {
            throw new BusinessRuleViolationException("TERMS_VERSION_CHANGED", "Terms have changed; review the current version");
        }
        return document;
    }
    private String locale(String value) {
        if (!"es".equals(value) && !"en".equals(value)) {
            throw new BusinessRuleViolationException("LEGAL_LOCALE_INVALID", "Choose es or en");
        }
        return value;
    }
}
