package com.vinnot.event.application.service;

import com.vinnot.event.application.port.out.EventRegistrationNoticeReader;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.application.query.response.EventAttendeeNotice;
import com.vinnot.event.domain.valueobject.CancellationRefund;
import com.vinnot.event.domain.valueobject.EventCancellation;
import com.vinnot.event.domain.valueobject.EventPaymentStatus;
import com.vinnot.event.domain.valueobject.EventStatus;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Persists a cancelled event and cancels its active registrations, in the caller's transaction. Each attendee gets
 * one cancellation email with the reason and refund information; the organizer gets one summary only when someone
 * else (an administrator) cancelled the event. Attendees also get one push, a single request for all of them, that
 * opens their tickets.
 */
@Service
@RequiredArgsConstructor
public class EventCancellationService {
    private final EventRepositoryPort events;
    private final EventRegistrationNoticeReader notices;
    private final NotificationPort notifications;
    private final PushNotificationPort pushes;

    /**
     * Saves a cancelled event, cancels its active registrations and tells each of them why, with what happens to
     * their money. These emails replace the generic registration notice, which the trigger skips for this
     * cascade (V44). The organizer gets a summary only when someone else cancelled the event.
     */
    public void saveCancelled(Event event, UUID actorId, EventCancellation cancellation) {
        if (event.getStatus() != EventStatus.CANCELLED) {
            throw new IllegalStateException("Only a cancelled event can be saved as a cancellation");
        }
        // Read before the cascade: afterwards nothing tells these registrations apart from earlier cancellations.
        List<EventAttendeeNotice> attendees = notices.findActiveAttendees(event.getId());
        int cancelled = events.saveCancellation(event, actorId);
        if (cancelled == 0) {
            return;
        }
        var organizer = notices.findOrganizer(event.getId());
        String timeZone = organizer.map(found -> found.timeZone()).orElse("UTC");
        attendees.forEach(attendee -> notifyAttendee(event, cancellation, timeZone, attendee));
        PushRequest.batches(NotificationType.EVENT_CANCELLED_ATTENDEE,
                attendees.stream().map(EventAttendeeNotice::userId).toList(), Map.of("title", event.getTitle()),
                "event-cancelled:" + event.getId(), false).forEach(pushes::push);
        if (Objects.equals(event.getOrganizerId(), actorId)) {
            return;
        }
        organizer.ifPresent(found -> notifications.enqueue(NotificationRequest.of(
                NotificationType.EVENT_CANCELLED_ORGANIZER_SUMMARY,
                NotificationRecipient.user(found.organizerId()),
                NotificationLocale.fromLanguage(found.language()),
                Map.of("title", event.getTitle(),
                        "cancelledRegistrations", Integer.toString(cancelled),
                        "startDate", event.getDateRange().getStartDate().toString(),
                        "timeZone", found.timeZone()),
                "event-cancelled-summary:" + event.getId())));
    }

    private void notifyAttendee(Event event, EventCancellation cancellation, String timeZone, EventAttendeeNotice attendee) {
        Map<String, String> data = new HashMap<>();
        data.put("title", event.getTitle());
        data.put("startDate", event.getDateRange().getStartDate().toString());
        data.put("timeZone", timeZone);
        data.put("reason", cancellation.reason().name());
        if (Objects.nonNull(cancellation.note())) {
            data.put("note", cancellation.note());
        }
        data.put("refund", CancellationRefund.of(EventPaymentStatus.valueOf(attendee.paymentStatus()),
                attendee.externallyManagedPayment()).name());
        // A cancelled event is terminal, so one email per registration is enough.
        notifications.enqueue(NotificationRequest.of(NotificationType.EVENT_CANCELLED_ATTENDEE,
                NotificationRecipient.address(attendee.recipient(), null), NotificationLocale.fromLanguage(attendee.language()),
                data, "event-cancelled:" + event.getId() + ":" + attendee.registrationId()));
    }
}
