package com.vinnot.event.application.service;

import com.vinnot.event.application.port.out.EventRegistrationNoticeReader;
import com.vinnot.event.application.port.out.NewEventAudience;
import com.vinnot.event.application.query.response.EventOrganizerNotice;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.valueobject.EventType;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventLocation;
import com.vinnot.event.domain.valueobject.EventRegistrationSettings;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushRequest;
import com.vinnot.shared.domain.valueobject.Coordinates;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class AnnounceNewEventNearbyServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-20T12:00:00Z");
    private static final Instant START = Instant.parse("2026-10-30T21:00:00Z");
    private final NewEventAudience audience = mock(NewEventAudience.class);
    private final EventRegistrationNoticeReader notices = mock(EventRegistrationNoticeReader.class);
    private final PushNotificationPort pushes = mock(PushNotificationPort.class);
    private final AnnounceNewEventNearbyService service = new AnnounceNewEventNearbyService(audience, notices, pushes);
    private final UUID organizer = UUID.randomUUID();
    private final UUID ana = UUID.randomUUID();
    private final Event event = Event.create("Cata de Malbec", EventType.TASTING, EventDateRange.of(START, START.plusSeconds(7200)), organizer);

    @Test
    void aFirstPublicationPushesTheEventToEveryoneNearUntilRegistrationCloses() {
        event.updateLocation(EventLocation.of("Bodega Norte", "Calle 1", "Luján de Cuyo", "Mendoza", "Argentina",
                Coordinates.of(-33.03, -68.87), null));
        event.publish();
        when(audience.near(new NewEventAudience.Place(organizer, "Mendoza", "Luján de Cuyo", -33.03, -68.87)))
                .thenReturn(List.of(ana));
        when(notices.findOrganizer(event.getId())).thenReturn(Optional.of(new EventOrganizerNotice(organizer, "es", "America/Argentina/Mendoza")));

        service.announce(event, false, NOW);

        verify(pushes).push(new PushRequest(NotificationType.EVENT_NEARBY, List.of(ana),
                Map.of("title", "Cata de Malbec", "eventId", event.getId().toString(), "startDate", START.toString(),
                        "timeZone", "America/Argentina/Mendoza", "place", "Luján de Cuyo"),
                "event-nearby:" + event.getId(), false, START));
    }

    @Test
    void theRegionNamesThePlaceWhenThereIsNoCityAndAnUnknownZoneIsUtc() {
        event.updateLocation(EventLocation.of(null, null, " ", "Salta", null, null, null));
        event.publish();
        when(audience.near(new NewEventAudience.Place(organizer, "Salta", " ", null, null))).thenReturn(List.of(ana));
        when(notices.findOrganizer(event.getId())).thenReturn(Optional.empty());

        service.announce(event, false, NOW);

        verify(pushes).push(new PushRequest(NotificationType.EVENT_NEARBY, List.of(ana),
                Map.of("title", "Cata de Malbec", "eventId", event.getId().toString(), "startDate", START.toString(),
                        "timeZone", "UTC", "place", "Salta"),
                "event-nearby:" + event.getId(), false, START));
    }

    @Test
    void anEventWithoutALocationOrWithoutCityAndRegionNamesNoPlace() {
        event.publish();
        Event venueOnly = Event.create("Venue only", EventType.TASTING, EventDateRange.of(START, START.plusSeconds(60)), organizer);
        venueOnly.updateLocation(EventLocation.of("Bodega Norte", "Calle 1", null, " ", "Argentina", null, null));
        venueOnly.publish();
        when(audience.near(new NewEventAudience.Place(organizer, null, null, null, null))).thenReturn(List.of(ana));
        when(audience.near(new NewEventAudience.Place(organizer, " ", null, null, null))).thenReturn(List.of(ana));
        when(notices.findOrganizer(any())).thenReturn(Optional.empty());

        service.announce(event, false, NOW);
        service.announce(venueOnly, false, NOW);

        verify(pushes).push(new PushRequest(NotificationType.EVENT_NEARBY, List.of(ana),
                Map.of("title", "Cata de Malbec", "eventId", event.getId().toString(), "startDate", START.toString(),
                        "timeZone", "UTC"),
                "event-nearby:" + event.getId(), false, START));
        verify(pushes).push(new PushRequest(NotificationType.EVENT_NEARBY, List.of(ana),
                Map.of("title", "Venue only", "eventId", venueOnly.getId().toString(), "startDate", START.toString(),
                        "timeZone", "UTC"),
                "event-nearby:" + venueOnly.getId(), false, START));
    }

    @Test
    void republishingDraftsSoldOutEventsClosedRegistrationAndNobodyNearAnnounceNothing() {
        event.publish();
        service.announce(event, true, NOW);

        Event draft = Event.create("Draft", EventType.TASTING, EventDateRange.of(START, START.plusSeconds(60)), organizer);
        service.announce(draft, false, NOW);

        Event closed = Event.create("Closed", EventType.TASTING, EventDateRange.of(START, START.plusSeconds(60)), organizer);
        closed.updateRegistrationSettings(EventRegistrationSettings.of("ARS", NOW.minusSeconds(60), 4, null, false, null, null, null, null));
        closed.publish();
        service.announce(closed, false, NOW);
        verifyNoInteractions(audience, pushes);

        when(audience.near(any())).thenReturn(List.of());
        service.announce(event, false, NOW);
        verifyNoInteractions(pushes);
    }
}
