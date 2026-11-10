package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.GoldenEmails;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class EventCancelledSummaryTemplateTest {
    private final NotificationTemplate template = new EventRegistrationTemplates()
            .eventCancelledOrganizerSummaryTemplate(GoldenEmails.brand(), GoldenEmails.SITE + "/");

    @Test
    void summarizesTheCancellationForTheOrganizerInBothLanguages() {
        GoldenEmails.assertSame("event-cancelled-summary-es", "owner@example.test",
                template.render(request(NotificationLocale.ES, "<Cata> & maridaje")));
        GoldenEmails.assertSame("event-cancelled-summary-en", "owner@example.test",
                template.render(request(NotificationLocale.EN, "Tasting")));
        assertThat(template.type()).isEqualTo(NotificationType.EVENT_CANCELLED_ORGANIZER_SUMMARY);
        assertThat(template.locales()).containsExactlyInAnyOrder(NotificationLocale.ES, NotificationLocale.EN);
    }

    private static NotificationRequest request(NotificationLocale locale, String title) {
        return NotificationRequest.of(NotificationType.EVENT_CANCELLED_ORGANIZER_SUMMARY,
                NotificationRecipient.user(UUID.fromString("11111111-2222-3333-4444-555555555555")), locale,
                Map.of("title", title, "cancelledRegistrations", "3", "startDate", "2026-10-20T12:00:00Z",
                        "timeZone", "America/Argentina/Buenos_Aires"), "event-cancelled-summary:1");
    }
}
