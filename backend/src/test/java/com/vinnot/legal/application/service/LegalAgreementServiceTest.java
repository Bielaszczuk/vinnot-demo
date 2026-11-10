package com.vinnot.legal.application.service;

import com.vinnot.legal.application.port.out.LegalAcceptancePort;
import com.vinnot.legal.application.port.out.LegalDocumentPort;
import com.vinnot.legal.domain.model.*;
import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class LegalAgreementServiceTest {
    private final LegalDocumentPort documents = mock(LegalDocumentPort.class);
    private final LegalAcceptancePort acceptances = mock(LegalAcceptancePort.class);
    private static final Instant NOW = Instant.parse("2026-11-10T12:00:00Z");
    private final LegalAgreementService service = new LegalAgreementService(documents, acceptances, Duration.ofDays(30),
            Clock.fixed(NOW, ZoneOffset.UTC));
    private final UUID user = UUID.randomUUID();
    private final TermsDocument es = document("v1", "r1", "es");
    private TermsDocument document(String version, String revision, String locale) {
        return new TermsDocument(version, revision, locale, "a".repeat(64), "Title", "Summary",
                List.of(new TermsDocument.Section("one", "Section", "Text")));
    }
    private TermsSelection selection(TermsDocument document) {
        return new TermsSelection(document.version(), document.locale(), document.contentHash(), true);
    }
    @Test void currentHistoryAndLocaleValidation() {
        when(documents.current("es")).thenReturn(es);
        when(documents.version("v1", "es")).thenReturn(es);
        assertThat(service.current("es")).isEqualTo(es);
        assertThat(service.version("v1", "es")).isEqualTo(es);
        assertThatThrownBy(() -> service.current(null)).isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> service.current("pt")).isInstanceOf(DomainException.class);
    }
    @Test void recordsOnlyExplicitCurrentConsentAndReturnsItsServerTimestamp() {
        when(documents.current("es")).thenReturn(es);
        when(acceptances.acceptedAt(user, "r1")).thenReturn(Optional.empty());
        assertThat(service.status(user, "es").required()).isTrue();
        var now = Instant.now();
        when(acceptances.acceptedAt(user, "r1")).thenReturn(Optional.of(now));
        var accepted = service.accept(user, selection(es));
        assertThat(accepted.required()).isFalse();
        assertThat(accepted.acceptedAt()).isEqualTo(now);
        verify(acceptances).accept(user, es);
        var en = document("v1", "r1", "en");
        when(documents.current("en")).thenReturn(en);
        assertThat(service.status(user, "en").required()).isFalse();
        when(documents.current("es")).thenReturn(document("v2", "r2", "es"));
        when(acceptances.acceptedAt(user, "r2")).thenReturn(Optional.empty());
        assertThat(service.status(user, "es").required()).isTrue();
    }
    @Test void aNewRevisionWaitsOutItsNoticePeriodOnlyForThoseWhoAcceptedAnEarlierOne() {
        TermsDocument v2 = document("v2", "r2", "es");
        when(documents.current("es")).thenReturn(v2);
        when(acceptances.acceptedAt(user, "r2")).thenReturn(Optional.empty());
        when(documents.revisionChangedAt(v2)).thenReturn(Optional.of(NOW.minus(Duration.ofDays(10))));
        Instant earlier = NOW.minus(Duration.ofDays(200));
        when(acceptances.latestAcceptanceOfOtherRevision(user, "r2")).thenReturn(Optional.of(earlier));

        TermsStatus notice = service.status(user, "es");
        assertThat(notice.required()).isFalse();
        assertThat(notice.acceptedAt()).as("older clients need an acceptance to let the person in").isEqualTo(earlier);
        assertThat(notice.requiredFrom()).isEqualTo(NOW.plus(Duration.ofDays(20)));
        assertThat(service.requiredFrom(v2)).contains(NOW.plus(Duration.ofDays(20)));

        when(acceptances.latestAcceptanceOfOtherRevision(user, "r2")).thenReturn(Optional.empty());
        assertThat(service.status(user, "es").required()).as("someone who never accepted terms").isTrue();

        when(acceptances.latestAcceptanceOfOtherRevision(user, "r2")).thenReturn(Optional.of(earlier));
        when(documents.revisionChangedAt(v2)).thenReturn(Optional.of(NOW.minus(Duration.ofDays(30))));
        TermsStatus due = service.status(user, "es");
        assertThat(due.required()).as("the notice period is over").isTrue();
        assertThat(due.requiredFrom()).isEqualTo(NOW);
        assertThat(due.acceptedAt()).isNull();

        when(documents.revisionChangedAt(v2)).thenReturn(Optional.empty());
        assertThat(service.status(user, "es").required()).as("the first revision ever").isTrue();
        assertThat(service.requiredFrom(v2)).isEmpty();
    }
    @Test void rejectsUncheckedStaleAndTamperedDocumentsWithoutWriting() {
        when(documents.current("es")).thenReturn(es);
        for (TermsSelection invalid : List.of(
                new TermsSelection("v1", "es", es.contentHash(), false),
                new TermsSelection("v0", "es", es.contentHash(), true),
                new TermsSelection("v1", "es", "b".repeat(64), true))) {
            assertThatThrownBy(() -> service.accept(user, invalid)).isInstanceOf(DomainException.class);
        }
        assertThatThrownBy(() -> service.accept(user, null)).isInstanceOf(DomainException.class);
        verifyNoInteractions(acceptances);
    }
    @Test void rolloutPreservesOldClientsButNeverInventsAcceptance() {
        when(documents.current("es")).thenReturn(es);
        when(acceptances.acceptedAt(user, "r1")).thenReturn(Optional.of(Instant.now()));
        service.validateRegistration(null);
        service.recordRegistration(user, null);
        verifyNoInteractions(acceptances);
        service.validateRegistration(selection(es));
        service.recordRegistration(user, selection(es));
        verify(acceptances).accept(user, es);
        when(documents.enforcementEnabled()).thenReturn(true);
        assertThat(service.enforcementEnabled()).isTrue();
        assertThatThrownBy(() -> service.validateRegistration(null)).isInstanceOf(DomainException.class);
    }
}
