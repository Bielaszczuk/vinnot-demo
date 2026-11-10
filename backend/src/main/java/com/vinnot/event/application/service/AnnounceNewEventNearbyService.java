package com.vinnot.event.application.service;

import com.vinnot.event.application.port.out.EventRegistrationNoticeReader;
import com.vinnot.event.application.port.out.NewEventAudience;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.valueobject.EventStatus;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Tells people whose area matches that an event was published for the first time, in the publishing transaction. A
 * sold-out event, or one whose registration already closed, is not announced, and the push expires when registration
 * closes. Delivery applies the EVENTS_NEARBY preference, quiet hours and the one-per-day limit.
 */
@Service
@RequiredArgsConstructor
public class AnnounceNewEventNearbyService {
    private final NewEventAudience audience;
    private final EventRegistrationNoticeReader notices;
    private final PushNotificationPort pushes;

    /**
     * @param event           the saved event
     * @param publishedBefore whether it had been published before this change
     */
    public void announce(Event event, boolean publishedBefore, Instant now) {
        if (publishedBefore || event.getStatus() != EventStatus.PUBLISHED) {
            return;
        }
        Instant start = event.getDateRange().getStartDate();
        Instant closes = event.getRegistrationSettings().effectiveDeadline(start);
        if (!closes.isAfter(now)) {
            return;
        }
        List<UUID> people = audience.near(placeOf(event));
        if (people.isEmpty()) {
            return;
        }
        Map<String, String> data = new HashMap<>();
        data.put("title", event.getTitle());
        data.put("eventId", event.getId().toString());
        data.put("startDate", start.toString());
        data.put("timeZone", notices.findOrganizer(event.getId()).map(found -> found.timeZone()).orElse("UTC"));
        String place = place(event);
        if (Objects.nonNull(place)) {
            data.put("place", place);
        }
        PushRequest.batches(NotificationType.EVENT_NEARBY, people, data, "event-nearby:" + event.getId(), false, closes)
                .forEach(pushes::push);
    }

    private static NewEventAudience.Place placeOf(Event event) {
        var location = event.getLocation();
        if (Objects.isNull(location)) {
            return new NewEventAudience.Place(event.getOrganizerId(), null, null, null, null);
        }
        var coordinates = location.getCoordinates();
        return new NewEventAudience.Place(event.getOrganizerId(), location.getRegion(), location.getCity(),
                Objects.isNull(coordinates) ? null : coordinates.getLatitude().doubleValue(),
                Objects.isNull(coordinates) ? null : coordinates.getLongitude().doubleValue());
    }

    private static String place(Event event) {
        var location = event.getLocation();
        if (Objects.isNull(location)) {
            return null;
        }
        for (String candidate : new String[] {location.getCity(), location.getRegion()}) {
            if (Objects.nonNull(candidate) && !candidate.isBlank()) {
                return candidate.strip();
            }
        }
        return null;
    }
}
