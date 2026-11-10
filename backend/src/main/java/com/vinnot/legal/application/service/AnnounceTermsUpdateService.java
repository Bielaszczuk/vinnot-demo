package com.vinnot.legal.application.service;

import com.vinnot.legal.application.port.in.AnnounceTermsUpdateUseCase;
import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.legal.application.port.out.TermsAnnouncementPort;
import com.vinnot.legal.domain.model.TermsDocument;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * While a new terms revision is in its notice period, emails everyone who accepted an earlier one, a batch per run, with
 * the date it becomes required. Once it is required there is nothing left to announce: the app asks them to accept.
 */
@Service
@RequiredArgsConstructor
public class AnnounceTermsUpdateService implements AnnounceTermsUpdateUseCase {
    static final int BATCH_SIZE = 500;
    private static final String TIME_ZONE = "America/Argentina/Buenos_Aires";
    private final LegalAgreementUseCase agreements;
    private final TermsAnnouncementPort announcements;
    private final NotificationPort notifications;

    @Override
    @Transactional
    public int execute(Instant now) {
        TermsDocument document = agreements.current("es");
        Optional<Instant> requiredFrom = agreements.requiredFrom(document).filter(now::isBefore);
        if (requiredFrom.isEmpty()) {
            return 0;
        }
        List<UUID> users = announcements.nextRecipients(document.acceptanceRevision(), BATCH_SIZE);
        Map<String, String> data = Map.of("version", document.version(), "requiredFrom", requiredFrom.get().toString(),
                "timeZone", TIME_ZONE);
        for (UUID user : users) {
            notifications.enqueue(NotificationRequest.of(NotificationType.TERMS_UPDATED, NotificationRecipient.user(user),
                    NotificationLocale.ES, data, "terms-updated:" + document.acceptanceRevision() + ":" + user));
        }
        return users.size();
    }
}
