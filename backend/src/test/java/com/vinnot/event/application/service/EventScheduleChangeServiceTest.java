package com.vinnot.event.application.service;

import com.vinnot.event.application.port.out.EventRegistrationNoticeReader;
import com.vinnot.event.application.query.response.EventAttendeeNotice;
import com.vinnot.event.application.query.response.EventOrganizerNotice;
import com.vinnot.event.domain.model.Event;
import java.util.Map;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventLocation;
import com.vinnot.event.domain.valueobject.EventType;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.event.application.port.out.EventReminderStore;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.PushRequest;
import com.vinnot.shared.domain.valueobject.Coordinates;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class EventScheduleChangeServiceTest {
    private static final Instant START = Instant.parse("2026-10-20T12:00:00Z");
    private final EventRegistrationNoticeReader notices = mock(EventRegistrationNoticeReader.class);
    private final NotificationPort notifications = mock(NotificationPort.class);
    private final EventReminderStore reminders = mock(EventReminderStore.class);
    private final PushNotificationPort pushes = mock(PushNotificationPort.class);
    private final EventScheduleChangeService service = new EventScheduleChangeService(notices, notifications, pushes, reminders);
    private final UUID ana = UUID.randomUUID();
    private final UUID bruno = UUID.randomUUID();
    private final Event event = Event.create("Tasting", EventType.TASTING, EventDateRange.of(START, START.plusSeconds(3600)), UUID.randomUUID());
    private final UUID first = UUID.randomUUID();
    private final UUID second = UUID.randomUUID();

    @Test
    void aNewDateReachesEachConfirmedAttendeeOnceWithThePreviousAndNewValues() {
        event.publish();
        var before = EventScheduleChangeService.Schedule.of(event);
        event.updateDateRange(EventDateRange.of(START.plusSeconds(86400), START.plusSeconds(90000)));
        attendees();

        service.announce(event, before);

        var requests = sent(2);
        var request = requests.get(0);
        assertThat(request.type()).isEqualTo(NotificationType.EVENT_CHANGED_ATTENDEE);
        assertThat(request.recipient()).isEqualTo(NotificationRecipient.address("ana@example.test", null));
        assertThat(request.locale()).isEqualTo(NotificationLocale.EN);
        assertThat(request.data()).containsEntry("previousStartDate", START.toString())
                .containsEntry("previousEndDate", START.plusSeconds(3600).toString())
                .containsEntry("startDate", START.plusSeconds(86400).toString())
                .containsEntry("endDate", START.plusSeconds(90000).toString())
                .containsEntry("timeZone", "America/Argentina/Buenos_Aires")
                .containsEntry("registrationId", first.toString())
                .doesNotContainKeys("venueChanged", "previousVenue", "venue");
        verify(reminders).rearm(event.getId());
        assertThat(requests).extracting(NotificationRequest::dedupeKey).containsExactly(
                "event-changed:" + event.getId() + ":1:" + first, "event-changed:" + event.getId() + ":1:" + second);
        verify(pushes).push(new PushRequest(NotificationType.EVENT_CHANGED_ATTENDEE, List.of(ana, bruno),
                Map.of("title", "Tasting", "eventId", event.getId().toString(), "change", "DATE"),
                "event-changed:" + event.getId() + ":1"));
    }

    @Test
    void aNewDateAndVenueTogetherPushOnceNamingBoth() {
        event.publish();
        var before = EventScheduleChangeService.Schedule.of(event);
        event.updateDateRange(EventDateRange.of(START.plusSeconds(86400), START.plusSeconds(90000)));
        event.updateLocation(EventLocation.of("New hall", "Calle 2", "Mendoza", null, null, null, null));
        attendees();

        service.announce(event, before);

        var push = ArgumentCaptor.forClass(PushRequest.class);
        verify(pushes).push(push.capture());
        assertThat(push.getValue().data()).containsEntry("change", "BOTH");
        assertThat(push.getValue().urgent()).isTrue();
    }

    @Test
    void aNewVenueShowsWhereItWasAndKeepsTheDateAsItIs() {
        event.publish();
        event.updateLocation(EventLocation.of("Old cellar", "Calle 1", "Mendoza", null, null, null, null));
        var before = EventScheduleChangeService.Schedule.of(event);
        event.updateLocation(EventLocation.of("New hall", "Calle 2", "Mendoza", null, null, null, null));
        attendees();

        service.announce(event, before);

        assertThat(sent(2).get(0).data()).containsEntry("venueChanged", "true")
                .containsEntry("previousVenue", "Old cellar, Calle 1, Mendoza")
                .containsEntry("venue", "New hall, Calle 2, Mendoza")
                .doesNotContainKey("previousStartDate");
        verifyNoInteractions(reminders);
        var push = ArgumentCaptor.forClass(PushRequest.class);
        verify(pushes).push(push.capture());
        assertThat(push.getValue().data()).containsEntry("change", "VENUE");
    }

    @Test
    void savingWithoutAScheduleChangeOrBeforePublishingSendsNothing() {
        var draft = EventScheduleChangeService.Schedule.of(event);
        event.updateDateRange(EventDateRange.of(START.plusSeconds(60), START.plusSeconds(3600)));
        service.announce(event, draft);

        event.publish();
        var published = EventScheduleChangeService.Schedule.of(event);
        event.updateDateRange(EventDateRange.of(START.plusSeconds(60), START.plusSeconds(3600)));
        event.updateLocation(EventLocation.of(null, null, null, null, null, null, null));
        event.updateLocation(EventLocation.of(null, " ", null, null, null,
                Coordinates.of(-32.9, -68.8), null));
        service.announce(event, published);

        verifyNoInteractions(notices, notifications, reminders, pushes);
    }

    private void attendees() {
        when(notices.findOrganizer(event.getId())).thenReturn(Optional.of(
                new EventOrganizerNotice(event.getOrganizerId(), "es", "America/Argentina/Buenos_Aires")));
        when(notices.findConfirmedAttendees(event.getId())).thenReturn(List.of(
                new EventAttendeeNotice(first, ana, "ana@example.test", "en", "APPROVED", true),
                new EventAttendeeNotice(second, bruno, "bruno@example.test", "es", "NOT_REQUIRED", false)));
    }

    private List<NotificationRequest> sent(int count) {
        var captor = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications, times(count)).enqueue(captor.capture());
        return captor.getAllValues();
    }
}
