package com.vinnot.event.infrastructure.persistence.adapter;

import com.vinnot.event.application.port.out.EventRegistrationPointsPort;
import com.vinnot.event.domain.valueobject.EventRegistrationStatus;
import com.vinnot.event.infrastructure.persistence.entity.EventRegistrationJpaEntity;
import com.vinnot.event.infrastructure.persistence.jpa.EventRegistrationJpaRepository;
import com.vinnot.shared.domain.valueobject.PageQuery;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** The organizer registrations list keeps a stable order: oldest request first, then id. */
class EventRegistrationPersistenceAdapterTest {
    private final EventRegistrationPointsPort points = mock(EventRegistrationPointsPort.class);

    private static final Sort OLDEST_FIRST = Sort.by(
            Sort.Order.asc("createdAt"), Sort.Order.asc("id"));

    private final EventRegistrationJpaRepository repository = mock(EventRegistrationJpaRepository.class);
    private final EventRegistrationPersistenceAdapter adapter =
            new EventRegistrationPersistenceAdapter(repository, points);

    @Test
    void listsAllRegistrationsOfAnEventOldestRequestFirst() {
        UUID eventId = UUID.randomUUID();
        when(repository.findByEventId(eq(eventId), any(Pageable.class))).thenReturn(Page.empty());

        adapter.findByEvent(eventId, null, PageQuery.of(1, 20));

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findByEventId(eq(eventId), pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isEqualTo(1);
        assertThat(pageable.getValue().getPageSize()).isEqualTo(20);
        assertThat(pageable.getValue().getSort()).isEqualTo(OLDEST_FIRST);
    }

    @Test
    void listsRegistrationsFilteredByStatusOldestRequestFirst() {
        UUID eventId = UUID.randomUUID();
        when(repository.findByEventIdAndStatus(eq(eventId), any(), any(Pageable.class)))
                .thenReturn(Page.empty());

        adapter.findByEvent(eventId, EventRegistrationStatus.WAITLISTED, PageQuery.of(0, 10));

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findByEventIdAndStatus(
                eq(eventId),
                eq(EventRegistrationJpaEntity.RegistrationStatusEnum.WAITLISTED),
                pageable.capture());
        assertThat(pageable.getValue().getPageSize()).isEqualTo(10);
        assertThat(pageable.getValue().getSort()).isEqualTo(OLDEST_FIRST);
    }
}
