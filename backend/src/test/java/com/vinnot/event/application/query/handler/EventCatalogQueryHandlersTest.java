package com.vinnot.event.application.query.handler;

import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.query.model.GetEventByIdQuery;
import com.vinnot.event.application.query.model.GetMyEventsQuery;
import com.vinnot.event.application.query.model.GetUpcomingEventsQuery;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventType;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EventCatalogQueryHandlersTest {

    @Test
    void getsEventDetailsOrReportsAnUnknownEvent() {
        EventRepositoryPort events = mock(EventRepositoryPort.class);
        Event event = event();
        event.publish();
        when(events.findById(event.getId())).thenReturn(Optional.of(event));
        GetEventByIdQueryHandler handler = new GetEventByIdQueryHandler(events);

        assertThat(handler.execute(new GetEventByIdQuery(event.getId())).id())
                .isEqualTo(event.getId());

        UUID missing = UUID.randomUUID();
        when(events.findById(missing)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> handler.execute(new GetEventByIdQuery(missing)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void mapsOrganizerAndUpcomingPagesToSummaryResponses() {
        EventRepositoryPort events = mock(EventRepositoryPort.class);
        Event event = event();
        when(events.findByOrganizer(any(), any()))
                .thenReturn(PageResult.of(List.of(event), 0, 10, 1));
        when(events.findUpcoming(any()))
                .thenReturn(PageResult.of(List.of(event), 0, 10, 1));

        var mine = new GetMyEventsQueryHandler(events).execute(
                new GetMyEventsQuery(event.getOrganizerId(), 0, 10));
        var upcoming = new GetUpcomingEventsQueryHandler(events).execute(
                new GetUpcomingEventsQuery(0, 10));

        assertThat(mine.content()).singleElement()
                .satisfies(item -> assertThat(item.id()).isEqualTo(event.getId()));
        assertThat(upcoming.content()).singleElement()
                .satisfies(item -> assertThat(item.id()).isEqualTo(event.getId()));
    }

    @Test
    void searchesTheOrganizersEventsWithATrimmedTermAndTheSameNewestFirstPage() {
        EventRepositoryPort events = mock(EventRepositoryPort.class);
        Event event = event();
        PageQuery newestFirst = PageQuery.of(1, 5, "createdAt", PageQuery.SortDirection.DESC);
        when(events.searchByOrganizer(event.getOrganizerId(), "Malbec", newestFirst))
                .thenReturn(PageResult.of(List.of(event), 1, 5, 6));

        var mine = new GetMyEventsQueryHandler(events).execute(
                new GetMyEventsQuery(event.getOrganizerId(), "  Malbec ", 1, 5));

        assertThat(mine.content()).singleElement()
                .satisfies(item -> assertThat(item.id()).isEqualTo(event.getId()));
        assertThat(mine.totalElements()).isEqualTo(6);
        verify(events, never()).findByOrganizer(any(), any());
    }

    @Test
    void aBlankOrMissingSearchListsEveryOwnEventAsBefore() {
        EventRepositoryPort events = mock(EventRepositoryPort.class);
        UUID organizer = UUID.randomUUID();
        PageQuery newestFirst = PageQuery.of(0, 20, "createdAt", PageQuery.SortDirection.DESC);
        when(events.findByOrganizer(organizer, newestFirst)).thenReturn(PageResult.of(List.of(), 0, 20, 0));
        GetMyEventsQueryHandler handler = new GetMyEventsQueryHandler(events);

        handler.execute(new GetMyEventsQuery(organizer, "   ", 0, 20));
        handler.execute(new GetMyEventsQuery(organizer, 0, 20));

        verify(events, times(2)).findByOrganizer(organizer, newestFirst);
        verify(events, never()).searchByOrganizer(any(), any(), any());
    }

    private Event event() {
        Instant start = Instant.now().plus(1, ChronoUnit.DAYS);
        return Event.create(
                "Wine tasting",
                EventType.TASTING,
                EventDateRange.of(start, start.plus(2, ChronoUnit.HOURS)),
                UUID.randomUUID());
    }
}
