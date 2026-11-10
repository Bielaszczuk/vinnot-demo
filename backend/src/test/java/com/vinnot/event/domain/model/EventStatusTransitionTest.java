package com.vinnot.event.domain.model;

import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventStatus;
import com.vinnot.event.domain.valueobject.EventType;
import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EventStatusTransitionTest {

    @Test
    void publishesDraftEventThroughManagedTransition() {
        Event event = futureEvent();

        event.transitionTo(EventStatus.PUBLISHED);

        assertThat(event.getStatus()).isEqualTo(EventStatus.PUBLISHED);
    }

    @Test
    void restoresCompletedEventToPublishedAfterCorrectingItsDates() {
        Event event = futureEvent();
        event.complete();

        event.transitionTo(EventStatus.PUBLISHED);

        assertThat(event.getStatus()).isEqualTo(EventStatus.PUBLISHED);
    }

    @Test
    void completesPublishedEvent() {
        Event event = futureEvent();
        event.publish();

        event.transitionTo(EventStatus.COMPLETED);

        assertThat(event.getStatus()).isEqualTo(EventStatus.COMPLETED);
    }

    @Test
    void cancelledEventCannotBeCompletedAndThereforeNotRepublished() {
        Event event = futureEvent();
        event.publish();
        event.cancel();

        assertThatThrownBy(() -> event.transitionTo(EventStatus.COMPLETED))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("CANNOT_COMPLETE");
        assertThatThrownBy(() -> event.transitionTo(EventStatus.PUBLISHED))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("CANNOT_PUBLISH");
        assertThat(event.getStatus()).isEqualTo(EventStatus.CANCELLED);
    }

    @Test
    void cancelledEventStaysCancelledForEveryManagedTransition() {
        for (EventStatus target : new EventStatus[] {
                EventStatus.DRAFT, EventStatus.PUBLISHED, EventStatus.POSTPONED, EventStatus.COMPLETED}) {
            Event event = futureEvent();
            event.cancel();

            assertThatThrownBy(() -> event.transitionTo(target))
                    .as("transition to %s", target)
                    .isInstanceOf(DomainException.class);
            assertThat(event.getStatus()).isEqualTo(EventStatus.CANCELLED);
        }
    }

    @Test
    void rejectsManuallySettingCapacityDerivedSoldOutStatus() {
        Event event = futureEvent();

        assertThatThrownBy(() -> event.transitionTo(EventStatus.SOLD_OUT))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_EVENT_STATUS");
    }

    private Event futureEvent() {
        Instant start = Instant.now().plus(1, ChronoUnit.DAYS);
        return Event.create(
                "Future tasting",
                EventType.TASTING,
                EventDateRange.of(start, start.plus(2, ChronoUnit.HOURS)),
                UUID.randomUUID());
    }
}
