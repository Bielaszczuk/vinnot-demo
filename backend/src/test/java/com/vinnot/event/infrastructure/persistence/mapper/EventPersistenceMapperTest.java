package com.vinnot.event.infrastructure.persistence.mapper;

import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventType;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class EventPersistenceMapperTest {
    @Test
    void keepsPublicationHistoryAcrossPersistenceAfterCancellation() {
        var start = Instant.now().plusSeconds(3600);
        for (boolean publish : new boolean[]{true, false}) {
            var event = Event.create("Tasting", EventType.TASTING,
                    EventDateRange.of(start, start.plusSeconds(3600)), UUID.randomUUID());
            if (publish) event.publish();
            event.cancel();
            var entity = EventPersistenceMapper.toEntity(event);
            assertThat(entity.isPublishedOnce()).isEqualTo(publish);
            assertThat(EventPersistenceMapper.toDomain(entity).isPubliclyVisible()).isEqualTo(publish);
        }
    }
}
