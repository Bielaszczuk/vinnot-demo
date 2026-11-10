package com.vinnot.event.application.service;

import com.vinnot.event.application.port.out.EventRegistrationNoticeReader;
import com.vinnot.event.application.port.out.EventReminderStore;
import com.vinnot.event.application.query.response.EventAttendeeNotice;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.valueobject.EventDateRange;
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

/**
 * Tells confirmed attendees of a published event that its date, time or venue changed, showing the previous and
 * the new values. Runs in the caller's transaction. Each notice is keyed on the event's schedule version, so
 * saving again without a new change sends nothing. A new date or time also lets attendees be reminded again.
 * Attendees also get one push, a single request for all of them, that opens the event and names what changed.
 */
@Service
@RequiredArgsConstructor
public class EventScheduleChangeService {
    private final EventRegistrationNoticeReader notices;
    private final NotificationPort notifications;
    private final PushNotificationPort pushes;
    private final EventReminderStore reminders;

    /**
     * @param event  the saved event
     * @param before the schedule as it was before this update
     */
    public void announce(Event event, Schedule before) {
        if (event.getScheduleVersion() == before.version()
                || (event.getStatus() != EventStatus.PUBLISHED && event.getStatus() != EventStatus.SOLD_OUT)) {
            return;
        }
        String timeZone = notices.findOrganizer(event.getId()).map(found -> found.timeZone()).orElse("UTC");
        Map<String, String> data = new HashMap<>();
        data.put("title", event.getTitle());
        data.put("timeZone", timeZone);
        data.put("startDate", event.getDateRange().getStartDate().toString());
        data.put("endDate", event.getDateRange().getEndDate().toString());
        putIfPresent(data, "venue", event.getVenue());
        boolean dateChanged = !before.dateRange().equals(event.getDateRange());
        boolean venueChanged = !Objects.equals(before.venue(), event.getVenue());
        if (dateChanged) {
            data.put("previousStartDate", before.dateRange().getStartDate().toString());
            data.put("previousEndDate", before.dateRange().getEndDate().toString());
            reminders.rearm(event.getId());
        }
        if (venueChanged) {
            data.put("venueChanged", "true");
            putIfPresent(data, "previousVenue", before.venue());
        }
        List<EventAttendeeNotice> attendees = notices.findConfirmedAttendees(event.getId());
        for (EventAttendeeNotice attendee : attendees) {
            Map<String, String> message = new HashMap<>(data);
            message.put("registrationId", attendee.registrationId().toString());
            notifications.enqueue(NotificationRequest.of(NotificationType.EVENT_CHANGED_ATTENDEE,
                    NotificationRecipient.address(attendee.recipient(), null), NotificationLocale.fromLanguage(attendee.language()),
                    message, "event-changed:" + event.getId() + ":" + event.getScheduleVersion() + ":" + attendee.registrationId()));
        }
        String change = dateChanged && venueChanged ? "BOTH" : dateChanged ? "DATE" : "VENUE";
        PushRequest.batches(NotificationType.EVENT_CHANGED_ATTENDEE, attendees.stream().map(EventAttendeeNotice::userId).toList(),
                Map.of("title", event.getTitle(), "eventId", event.getId().toString(), "change", change),
                "event-changed:" + event.getId() + ":" + event.getScheduleVersion(), false).forEach(pushes::push);
    }

    private static void putIfPresent(Map<String, String> data, String key, String value) {
        if (Objects.nonNull(value)) {
            data.put(key, value);
        }
    }

    /** What attendees knew before an update: when and where, and the version that keyed it. */
    public record Schedule(EventDateRange dateRange, String venue, long version) {
        public static Schedule of(Event event) {
            return new Schedule(event.getDateRange(), event.getVenue(), event.getScheduleVersion());
        }
    }
}
