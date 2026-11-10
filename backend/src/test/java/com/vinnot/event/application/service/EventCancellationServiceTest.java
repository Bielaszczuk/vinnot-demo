package com.vinnot.event.application.service;

import com.vinnot.event.application.port.out.EventRegistrationNoticeReader;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.query.response.EventAttendeeNotice;
import com.vinnot.event.application.query.response.EventOrganizerNotice;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.valueobject.EventCancellation;
import com.vinnot.event.domain.valueobject.EventCancellationReason;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventType;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.PushRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class EventCancellationServiceTest {
    private static final Instant START = Instant.parse("2026-10-20T12:00:00Z");
    private final EventRepositoryPort events = mock(EventRepositoryPort.class);
    private final EventRegistrationNoticeReader notices = mock(EventRegistrationNoticeReader.class);
    private final NotificationPort notifications = mock(NotificationPort.class);
    private final PushNotificationPort pushes = mock(PushNotificationPort.class);
    private final EventCancellationService service = new EventCancellationService(events, notices, notifications, pushes);
    private final UUID organizer = UUID.randomUUID();
    private final Event event = Event.create("Tasting", EventType.TASTING,
            EventDateRange.of(START, START.plusSeconds(3600)), organizer);

    @Test
    void someoneElseCancellingTheEventSendsTheOrganizerOneSummaryInTheirLanguage() {
        event.cancel();
        UUID admin = UUID.randomUUID();
        when(events.saveCancellation(event, admin)).thenReturn(3);
        when(notices.findOrganizer(event.getId())).thenReturn(Optional.of(
                new EventOrganizerNotice(organizer, "en", "Europe/Madrid")));

        service.saveCancelled(event, admin, EventCancellation.unspecified());

        var request = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications).enqueue(request.capture());
        assertThat(request.getValue().type()).isEqualTo(NotificationType.EVENT_CANCELLED_ORGANIZER_SUMMARY);
        assertThat(request.getValue().category()).isEqualTo(NotificationCategory.TICKETS);
        assertThat(request.getValue().recipient()).isEqualTo(NotificationRecipient.user(organizer));
        assertThat(request.getValue().locale()).isEqualTo(NotificationLocale.EN);
        assertThat(request.getValue().dedupeKey()).isEqualTo("event-cancelled-summary:" + event.getId());
        assertThat(request.getValue().data()).isEqualTo(Map.of("title", "Tasting", "cancelledRegistrations", "3",
                "startDate", "2026-10-20T12:00:00Z", "timeZone", "Europe/Madrid"));
    }

    @Test
    void theOrganizerCancellingTheirOwnEventGetsNoSummary() {
        event.cancel();
        when(events.saveCancellation(event, organizer)).thenReturn(5);

        service.saveCancelled(event, organizer, EventCancellation.unspecified());

        verify(events).saveCancellation(event, organizer);
        verify(notifications, never()).enqueue(any());
    }

    @Test
    void everyActiveAttendeeLearnsTheReasonTheNoteAndWhatHappensToTheirMoney() {
        event.cancel();
        var online = new EventAttendeeNotice(UUID.randomUUID(), UUID.randomUUID(), "paid@example.test", "en", "APPROVED", true);
        var transfer = new EventAttendeeNotice(UUID.randomUUID(), UUID.randomUUID(), "transfer@example.test", "es", "REPORTED", false);
        var free = new EventAttendeeNotice(UUID.randomUUID(), UUID.randomUUID(), "free@example.test", "es", "NOT_REQUIRED", false);
        when(notices.findActiveAttendees(event.getId())).thenReturn(List.of(online, transfer, free));
        when(events.saveCancellation(event, organizer)).thenReturn(3);
        when(notices.findOrganizer(event.getId())).thenReturn(Optional.of(
                new EventOrganizerNotice(organizer, "es", "America/Argentina/Mendoza")));

        service.saveCancelled(event, organizer, new EventCancellation(EventCancellationReason.OTHER, "  Sommelier enfermo "));

        var sent = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications, times(3)).enqueue(sent.capture());
        var requests = sent.getAllValues();
        assertThat(requests).extracting(NotificationRequest::type).containsOnly(NotificationType.EVENT_CANCELLED_ATTENDEE);
        assertThat(requests).extracting(r -> r.recipient().email())
                .containsExactly("paid@example.test", "transfer@example.test", "free@example.test");
        assertThat(requests).extracting(r -> r.data().get("refund")).containsExactly("ONLINE", "ORGANIZER", "NONE");
        assertThat(requests.getFirst().locale()).isEqualTo(NotificationLocale.EN);
        assertThat(requests.getFirst().data()).containsEntry("reason", "OTHER").containsEntry("note", "Sommelier enfermo")
                .containsEntry("title", "Tasting").containsEntry("timeZone", "America/Argentina/Mendoza")
                .containsEntry("startDate", "2026-10-20T12:00:00Z");
        assertThat(requests.getFirst().dedupeKey()).isEqualTo("event-cancelled:" + event.getId() + ":" + online.registrationId());
        verify(pushes).push(new PushRequest(NotificationType.EVENT_CANCELLED_ATTENDEE,
                List.of(online.userId(), transfer.userId(), free.userId()), Map.of("title", "Tasting"),
                "event-cancelled:" + event.getId()));
    }

    @Test
    void withoutAChosenReasonAttendeesReadThePreselectedOne() {
        event.cancel();
        when(notices.findActiveAttendees(event.getId())).thenReturn(List.of(
                new EventAttendeeNotice(UUID.randomUUID(), UUID.randomUUID(), "a@example.test", "es", "PENDING", false)));
        when(events.saveCancellation(event, organizer)).thenReturn(1);

        service.saveCancelled(event, organizer, EventCancellation.unspecified());

        var sent = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications).enqueue(sent.capture());
        assertThat(sent.getValue().data()).containsEntry("reason", "UNFORESEEN_CIRCUMSTANCES").doesNotContainKey("note")
                .containsEntry("refund", "NONE").containsEntry("timeZone", "UTC");
    }

    @Test
    void noSummaryWhenNoRegistrationWasCancelled() {
        event.cancel();
        UUID admin = UUID.randomUUID();
        when(events.saveCancellation(event, admin)).thenReturn(0);

        service.saveCancelled(event, admin, EventCancellation.unspecified());

        verifyNoInteractions(notifications, pushes);
    }

    @Test
    void refusesAnEventThatIsNotCancelled() {
        assertThatThrownBy(() -> service.saveCancelled(event, organizer, EventCancellation.unspecified())).isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(events, notifications, pushes);
    }

    @Test
    void aMissingOrganizerAccountSkipsTheSummary() {
        event.cancel();
        UUID admin = UUID.randomUUID();
        when(events.saveCancellation(any(), any())).thenReturn(2);
        when(notices.findOrganizer(event.getId())).thenReturn(Optional.empty());

        service.saveCancelled(event, admin, EventCancellation.unspecified());

        verifyNoInteractions(notifications);
    }
}
