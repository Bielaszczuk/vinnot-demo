package com.vinnot.event.application.query.handler;

import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.query.model.DiscoverEventsQuery;
import com.vinnot.event.application.query.response.EventDiscoveryResponse;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.valueobject.EventCapacity;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventLocation;
import com.vinnot.event.domain.valueobject.EventRegistrationSettings;
import com.vinnot.event.domain.valueobject.EventStatus;
import com.vinnot.event.domain.valueobject.EventType;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.valueobject.Coordinates;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DiscoverEventsQueryHandlerTest {

    private static final double COMODORO_LATITUDE = -45.8641;
    private static final double COMODORO_LONGITUDE = -67.4966;

    @Mock
    private EventRepositoryPort eventRepository;

    @Test
    void rejectsNonFiniteCoordinatesAndRadiusBeforeQueryingTheCatalog() {
        for (double value : new double[] {Double.NaN, Double.POSITIVE_INFINITY,
                Double.NEGATIVE_INFINITY}) {
            for (DiscoverEventsQuery request : List.of(
                    new DiscoverEventsQuery(value, 0, 50, 0, 20),
                    new DiscoverEventsQuery(0, value, 50, 0, 20),
                    new DiscoverEventsQuery(0, 0, value, 0, 20))) {
                assertThatThrownBy(() -> handler().execute(request))
                        .isInstanceOf(BusinessRuleViolationException.class);
            }
        }
        verifyNoInteractions(eventRepository);
    }

    @Test
    void veryLargePageReturnsAnEmptySliceWithoutIntegerOverflow() {
        when(eventRepository.findDiscoveryCandidates(500)).thenReturn(List.of(
                event("Nearby", Instant.now().plus(1, ChronoUnit.DAYS), Coordinates.of(0, 0))));
        var result = handler().execute(new DiscoverEventsQuery(0, 0, 50, Integer.MAX_VALUE, 20));
        assertThat(result.nearbyEvents().content()).isEmpty();
        assertThat(result.nearbyEvents().totalElements()).isEqualTo(1);
    }

    @Test
    void returnsNearbyEventsOrderedByExactDistance() {
        Event farther = event(
                "Farther event",
                Instant.now().plus(2, ChronoUnit.DAYS),
                Coordinates.of(-46.0, -67.6));
        Event closest = event(
                "Closest event",
                Instant.now().plus(3, ChronoUnit.DAYS),
                Coordinates.of(-45.87, -67.50));
        when(eventRepository.findDiscoveryCandidates(500)).thenReturn(List.of(farther, closest));

        EventDiscoveryResponse response = handler().execute(query(100));

        assertThat(response.nearbyEventsFound()).isTrue();
        assertThat(response.message()).isNull();
        assertThat(response.nearbyEvents().content())
                .extracting("title")
                .containsExactly("Closest event", "Farther event");
        assertThat(response.otherEvents().content()).isEmpty();
    }

    @Test
    void returnsTheFallbackMessageAndAllEventsWithUnknownLocationsLast() {
        Event noCoordinates = event(
                "Unknown location",
                Instant.now().plus(1, ChronoUnit.DAYS),
                null);
        Event remote = event(
                "Remote event",
                Instant.now().plus(2, ChronoUnit.DAYS),
                Coordinates.of(-42.77, -65.03));
        when(eventRepository.findDiscoveryCandidates(500))
                .thenReturn(List.of(noCoordinates, remote));

        EventDiscoveryResponse response = handler().execute(query(10));

        assertThat(response.nearbyEventsFound()).isFalse();
        assertThat(response.message())
                .isEqualTo("No encontramos eventos cerca de tu zona actualmente.");
        assertThat(response.nearbyEvents().content()).isEmpty();
        assertThat(response.otherEvents().content())
                .extracting("title")
                .containsExactly("Remote event", "Unknown location");
    }

    @Test
    void rejectsInvalidCoordinatesRadiusAndPaginationBeforeQueryingPersistence() {
        assertThatThrownBy(() -> handler().execute(
                new DiscoverEventsQuery(91, COMODORO_LONGITUDE, 100, 0, 20)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("INVALID_COORDINATES");
        assertThatThrownBy(() -> handler().execute(query(-1)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("INVALID_EVENT_RADIUS");
        assertThatThrownBy(() -> handler().execute(
                new DiscoverEventsQuery(
                        COMODORO_LATITUDE,
                        COMODORO_LONGITUDE,
                        100,
                        -1,
                        20)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("INVALID_EVENT_PAGINATION");

        verifyNoInteractions(eventRepository);
    }

    private DiscoverEventsQueryHandler handler() {
        return new DiscoverEventsQueryHandler(eventRepository);
    }

    private DiscoverEventsQuery query(double radiusKm) {
        return new DiscoverEventsQuery(
                COMODORO_LATITUDE,
                COMODORO_LONGITUDE,
                radiusKm,
                0,
                20);
    }

    private Event event(String title, Instant start, Coordinates coordinates) {
        EventLocation location = EventLocation.of(
                title + " venue",
                null,
                "City",
                "Region",
                "Argentina",
                coordinates,
                null);
        return Event.builder()
                .id(UUID.randomUUID())
                .title(title)
                .eventType(EventType.TASTING)
                .dateRange(EventDateRange.of(start, start.plus(2, ChronoUnit.HOURS)))
                .location(location)
                .capacity(EventCapacity.withLimit(100))
                .registrationSettings(EventRegistrationSettings.defaults())
                .status(EventStatus.PUBLISHED)
                .organizerId(UUID.randomUUID())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }
}
