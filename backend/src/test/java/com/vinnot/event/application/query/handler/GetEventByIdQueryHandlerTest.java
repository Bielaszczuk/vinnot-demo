package com.vinnot.event.application.query.handler;

import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.query.model.GetEventByIdQuery;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventType;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.ResourceReader;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class GetEventByIdQueryHandlerTest {
    @Test
    void draftIsPrivateWhilePublishedHistoricalDetailsRemainAccessible() {
        var repository = mock(EventRepositoryPort.class);
        var event = Event.create("Tasting", EventType.TASTING,
                EventDateRange.of(Instant.now().plusSeconds(1000), Instant.now().plusSeconds(2000)), UUID.randomUUID());
        when(repository.findById(event.getId())).thenReturn(Optional.of(event));
        var handler = new GetEventByIdQueryHandler(repository);
        var publicQuery = new GetEventByIdQuery(event.getId());
        assertThatThrownBy(() -> handler.execute(publicQuery)).isInstanceOf(EntityNotFoundException.class);
        assertThatThrownBy(() -> handler.execute(new GetEventByIdQuery(event.getId(), new ResourceReader(UUID.randomUUID(), false))))
                .isInstanceOf(EntityNotFoundException.class);
        assertThat(handler.execute(new GetEventByIdQuery(event.getId(), ResourceReader.staff())).id()).isEqualTo(event.getId());
        assertThat(handler.execute(new GetEventByIdQuery(event.getId(), new ResourceReader(event.getOrganizerId(), false))).id()).isEqualTo(event.getId());
        event.publish();
        assertThat(handler.execute(publicQuery).id()).isEqualTo(event.getId());
        event.cancel();
        assertThat(handler.execute(publicQuery).id()).isEqualTo(event.getId());
    }

    @Test
    void detailsSayWhetherTheEventHasAPublicPageSoClientsOnlyOfferShareThen() {
        var repository = mock(EventRepositoryPort.class);
        var handler = new GetEventByIdQueryHandler(repository);
        var neverPublished = event(repository);
        var organizer = new ResourceReader(neverPublished.getOrganizerId(), false);
        assertThat(handler.execute(new GetEventByIdQuery(neverPublished.getId(), organizer)).publiclyVisible()).isFalse();
        neverPublished.cancel();
        assertThat(handler.execute(new GetEventByIdQuery(neverPublished.getId(), organizer)).publiclyVisible())
                .as("cancelled straight from draft").isFalse();
        var published = event(repository);
        published.publish();
        assertThat(handler.execute(new GetEventByIdQuery(published.getId())).publiclyVisible()).isTrue();
        published.cancel();
        assertThat(handler.execute(new GetEventByIdQuery(published.getId())).publiclyVisible()).isTrue();
    }

    private static Event event(EventRepositoryPort repository) {
        var event = Event.create("Tasting", EventType.TASTING,
                EventDateRange.of(Instant.now().plusSeconds(1000), Instant.now().plusSeconds(2000)), UUID.randomUUID());
        when(repository.findById(event.getId())).thenReturn(Optional.of(event));
        return event;
    }
}
