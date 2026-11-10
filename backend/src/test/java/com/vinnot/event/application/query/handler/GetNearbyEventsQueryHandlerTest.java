package com.vinnot.event.application.query.handler;

import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.query.model.GetNearbyEventsQuery;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class GetNearbyEventsQueryHandlerTest {
    private final EventRepositoryPort repository = mock(EventRepositoryPort.class);
    private final GetNearbyEventsQueryHandler handler = new GetNearbyEventsQueryHandler(repository);

    @Test
    void rejectsInvalidCoordinatesRadiusAndPagingBeforeDatabaseAccess() {
        for (var query : List.of(
                query(Double.NaN, 0, 1), query(91, 0, 1), query(0, Double.POSITIVE_INFINITY, 1),
                query(0, -181, 1), query(0, 0, Double.NEGATIVE_INFINITY), query(0, 0, 0),
                query(0, 0, 501), new GetNearbyEventsQuery(0, 0, 50, -1, 20),
                new GetNearbyEventsQuery(0, 0, 50, 0, 0), new GetNearbyEventsQuery(0, 0, 50, 0, 201),
                new GetNearbyEventsQuery(0, 0, 50, Integer.MAX_VALUE, 20))) {
            assertThatThrownBy(() -> handler.execute(query)).isInstanceOf(BusinessRuleViolationException.class);
        }
        verifyNoInteractions(repository);
    }

    @Test
    void largeValidPageReturnsEmptyWithoutAnOverflow() {
        assertThat(handler.execute(new GetNearbyEventsQuery(0, 0, 50, 100_000_000, 20)).content()).isEmpty();
    }

    private GetNearbyEventsQuery query(double lat, double lon, double radius) {
        return new GetNearbyEventsQuery(lat, lon, radius, 0, 20);
    }
}
