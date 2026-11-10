package com.vinnot.legal.application.service;

import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.legal.application.port.out.TermsAnnouncementPort;
import com.vinnot.legal.domain.model.TermsDocument;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class AnnounceTermsUpdateServiceTest {
    private static final Instant NOW = Instant.parse("2026-11-10T12:00:00Z");
    private static final Instant REQUIRED_FROM = Instant.parse("2026-12-01T03:00:00Z");
    private final LegalAgreementUseCase agreements = mock(LegalAgreementUseCase.class);
    private final TermsAnnouncementPort announcements = mock(TermsAnnouncementPort.class);
    private final NotificationPort notifications = mock(NotificationPort.class);
    private final AnnounceTermsUpdateService service = new AnnounceTermsUpdateService(agreements, announcements, notifications);
    private final TermsDocument terms = new TermsDocument("2026-11-01.1", "terms-2", "es", "a".repeat(64), "Terms", "Summary", List.of());

    @Test
    void eachRunEmailsTheNextBatchWithTheDateAcceptanceIsRequired() {
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();
        when(agreements.current("es")).thenReturn(terms);
        when(agreements.requiredFrom(terms)).thenReturn(Optional.of(REQUIRED_FROM));
        when(announcements.nextRecipients("terms-2", AnnounceTermsUpdateService.BATCH_SIZE)).thenReturn(List.of(first, second));

        assertThat(service.execute(NOW)).isEqualTo(2);

        Map<String, String> data = Map.of("version", "2026-11-01.1", "requiredFrom", REQUIRED_FROM.toString(),
                "timeZone", "America/Argentina/Buenos_Aires");
        verify(notifications).enqueue(NotificationRequest.of(NotificationType.TERMS_UPDATED, NotificationRecipient.user(first),
                NotificationLocale.ES, data, "terms-updated:terms-2:" + first));
        verify(notifications).enqueue(NotificationRequest.of(NotificationType.TERMS_UPDATED, NotificationRecipient.user(second),
                NotificationLocale.ES, data, "terms-updated:terms-2:" + second));
    }

    @Test
    void nothingIsAnnouncedForTheFirstRevisionOrOnceAcceptanceIsRequired() {
        when(agreements.current("es")).thenReturn(terms);
        when(agreements.requiredFrom(terms)).thenReturn(Optional.empty());
        assertThat(service.execute(NOW)).isZero();

        when(agreements.requiredFrom(terms)).thenReturn(Optional.of(NOW));
        assertThat(service.execute(NOW)).isZero();

        verify(announcements, never()).nextRecipients(anyString(), anyInt());
        verifyNoInteractions(notifications);
    }
}
