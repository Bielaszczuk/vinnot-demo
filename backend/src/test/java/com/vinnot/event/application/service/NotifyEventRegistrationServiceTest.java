package com.vinnot.event.application.service;

import com.vinnot.event.application.port.out.EventRegistrationNoticeReader;
import com.vinnot.event.application.query.response.EventRegistrationNotice;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.event.application.port.out.OrganizerActivityDigest;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.PushRequest;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class NotifyEventRegistrationServiceTest {
    private final EventRegistrationNoticeReader reader = mock(EventRegistrationNoticeReader.class);
    private final NotificationPort notifications = mock(NotificationPort.class);
    private final PushNotificationPort pushes =
            mock(PushNotificationPort.class);
    private final OrganizerActivityDigest digests =
            mock(OrganizerActivityDigest.class);
    private final NotifyEventRegistrationService service = new NotifyEventRegistrationService(reader, notifications, pushes, digests);
    private final UUID registrationId = UUID.randomUUID();
    private final Instant start = Instant.parse("2026-10-20T12:00:00Z");
    private final Instant expires = Instant.parse("2026-10-19T18:45:00Z");

    @Test
    void enqueuesTheCurrentOrganizerVersionWithEveryRenderedDetail() {
        var notice = new EventRegistrationNotice(registrationId, UUID.randomUUID(), "owner@example.test", UUID.randomUUID(),
                "en", true, "Tasting", "AWAITING_PAYMENT", "PENDING", 2, start, expires, "Guest", "+541100000000",
                "America/Argentina/Buenos_Aires");
        when(reader.findCurrent(registrationId, 2L, true)).thenReturn(Optional.of(notice));
        service.notify(registrationId, 2L, true);
        var request = captured();
        assertThat(request.type()).isEqualTo(NotificationType.EVENT_REGISTRATION_ORGANIZER);
        assertThat(request.category()).isEqualTo(NotificationCategory.TICKETS);
        assertThat(request.recipient()).isEqualTo(NotificationRecipient.address("owner@example.test", null));
        assertThat(request.locale()).isEqualTo(NotificationLocale.EN);
        assertThat(request.dedupeKey()).isEqualTo("event-registration:" + registrationId + ":2:ORGANIZER");
        assertThat(request.data()).isEqualTo(Map.of("registrationId", registrationId.toString(), "title", "Tasting",
                "status", "AWAITING_PAYMENT", "paymentStatus", "PENDING", "attendees", "2",
                "startDate", "2026-10-20T12:00:00Z", "expiresAt", "2026-10-19T18:45:00Z",
                "contactName", "Guest", "contactPhone", "+541100000000", "timeZone", "America/Argentina/Buenos_Aires"));
        verifyNoInteractions(pushes, digests);
    }

    @ParameterizedTest
    @CsvSource({"CONFIRMED,APPROVED,CONFIRMED", "REQUESTED,PENDING,REQUESTED",
            "CANCELLED,NOT_REQUIRED,CANCELLED", "AWAITING_PAYMENT,REPORTED,REQUESTED"})
    void organizerActivityJoinsTheEventDigestInsteadOfPushing(String status, String payment, String activity) {
        UUID event = UUID.randomUUID();
        UUID owner = UUID.randomUUID();
        var notice = new EventRegistrationNotice(registrationId, event, "owner@example.test", owner,
                "es", true, "Cata", status, payment, 1, start, null, null, null);
        when(reader.findCurrent(registrationId, 2L, true)).thenReturn(Optional.of(notice));
        service.notify(registrationId, 2L, true);
        verify(digests).add(event, owner, OrganizerActivityDigest.Activity.valueOf(activity),
                Duration.ofMinutes(15));
        verifyNoInteractions(pushes);
    }

    @ParameterizedTest
    @CsvSource({"CONFIRMED,REFUNDED", "WAITLISTED,NOT_REQUIRED", "EXPIRED,PENDING",
            "AWAITING_PAYMENT,PENDING"})
    void otherOrganizerChangesOnlyEmail(String status, String payment) {
        var notice = new EventRegistrationNotice(registrationId, UUID.randomUUID(), "owner@example.test", UUID.randomUUID(),
                "es", true, "Cata", status, payment, 1, start, null, null, null);
        when(reader.findCurrent(registrationId, 2L, true)).thenReturn(Optional.of(notice));
        service.notify(registrationId, 2L, true);
        verify(notifications).enqueue(any());
        verifyNoInteractions(pushes, digests);
    }

    @Test
    void theAttendeeAlsoGetsAPushThatOpensTheTicketUnderTheEmailKey() {
        UUID attendee = UUID.randomUUID();
        var notice = new EventRegistrationNotice(registrationId, UUID.randomUUID(), "guest@example.test", attendee,
                "es", false, "Cata", "AWAITING_PAYMENT", "REJECTED", 1, start, null, null, null);
        when(reader.findCurrent(registrationId, 4L, false)).thenReturn(Optional.of(notice));
        service.notify(registrationId, 4L, false);
        verify(pushes).push(new PushRequest(NotificationType.EVENT_REGISTRATION_ATTENDEE,
                List.of(attendee), Map.of("registrationId", registrationId.toString(), "title", "Cata",
                        "status", "AWAITING_PAYMENT", "paymentStatus", "REJECTED"),
                "event-registration:" + registrationId + ":4:ATTENDEE"));
    }

    @Test
    void attendeeNoticesKeepTheRegistrationLanguageAndOmitMissingDetails() {
        var notice = new EventRegistrationNotice(registrationId, UUID.randomUUID(), "guest@example.test", UUID.randomUUID(),
                "es", false, "Cata", "CONFIRMED", "APPROVED", 1, start, null, null, null);
        when(reader.findCurrent(registrationId, 3L, false)).thenReturn(Optional.of(notice));
        service.notify(registrationId, 3L, false);
        var request = captured();
        assertThat(request.type()).isEqualTo(NotificationType.EVENT_REGISTRATION_ATTENDEE);
        assertThat(request.locale()).isEqualTo(NotificationLocale.ES);
        assertThat(request.dedupeKey()).isEqualTo("event-registration:" + registrationId + ":3:ATTENDEE");
        assertThat(request.data()).doesNotContainKeys("expiresAt", "contactName", "contactPhone")
                .containsEntry("timeZone", "UTC");
    }

    @Test
    void skipsMissingOrSupersededTransitions() {
        when(reader.findCurrent(registrationId, 1L, false)).thenReturn(Optional.empty());
        service.notify(registrationId, 1L, false);
        verifyNoInteractions(notifications, pushes, digests);
    }

    @Test
    void propagatesOutboxFailuresSoTheDurableWorkerCanRetry() {
        var notice = new EventRegistrationNotice(registrationId, UUID.randomUUID(), "guest@example.test", UUID.randomUUID(),
                "es", false, "Cata", "CONFIRMED", "APPROVED", 2, start, null, "Guest", null);
        when(reader.findCurrent(registrationId, 2L, false)).thenReturn(Optional.of(notice));
        doThrow(new IllegalStateException("Outbox unavailable")).when(notifications).enqueue(any());
        assertThatThrownBy(() -> service.notify(registrationId, 2L, false)).isInstanceOf(IllegalStateException.class);
    }

    private NotificationRequest captured() {
        var request = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications).enqueue(request.capture());
        return request.getValue();
    }
}
