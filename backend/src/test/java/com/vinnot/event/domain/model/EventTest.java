package com.vinnot.event.domain.model;

import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventStatus;
import com.vinnot.event.domain.valueobject.EventType;
import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EventTest {

    @Test
    void historyPreservesPublishedEventsWithoutPublishingCancelledDrafts() {
        Event draft = futureEvent();
        draft.cancel();
        assertThat(draft.isPublishedOnce()).isFalse();
        assertThat(draft.isPubliclyVisible()).isFalse();
        Event completedDraft = futureEvent();
        completedDraft.complete();
        assertThat(completedDraft.isPubliclyVisible()).isFalse();
        Event published = futureEvent();
        published.publish();
        published.transitionTo(EventStatus.POSTPONED);
        assertThat(published.isPubliclyVisible()).isTrue();
        published.transitionTo(EventStatus.DRAFT);
        assertThat(published.isPublishedOnce()).isTrue();
        assertThat(published.isPubliclyVisible()).isFalse();
        published.publish();
        published.complete();
        assertThat(published.isPubliclyVisible()).isTrue();
    }

    @Test
    void createsDraftWithRegistrationDefaultsAndEditableCommercialData() {
        Event event = futureEvent();

        event.updateBasicInfo(" Updated ", "Description", EventType.DINNER);
        event.updatePrice(new BigDecimal("10000"));
        event.updateCapacity(20);
        event.updateContactInfo("mail@test.com", "+54", "https://event.test");

        assertThat(event.getTitle()).isEqualTo("Updated");
        assertThat(event.getEventType()).isEqualTo(EventType.DINNER);
        assertThat(event.getPrice()).isEqualByComparingTo("10000");
        assertThat(event.getCapacity().getMaxAttendees()).isEqualTo(20);
        assertThat(event.getStatus()).isEqualTo(EventStatus.DRAFT);
        assertThat(event.getRegistrationSettings()).isNotNull();
        assertThat(event.getContactEmail()).isEqualTo("mail@test.com");
    }

    @Test
    void enforcesPriceAndAtomicCapacityAvailability() {
        Event event = futureEvent();
        assertThatThrownBy(() -> event.updatePrice(new BigDecimal("-1")))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_PRICE");

        event.updateCapacity(2);
        event.publish();
        event.holdAttendees(2);

        assertThat(event.hasAvailableCapacity(1)).isFalse();
        assertThatThrownBy(() -> event.ensureRegistrationOpen(1))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("EVENT_SOLD_OUT");
    }

    @Test
    void preventsInvalidTerminalLifecycleTransitions() {
        Event cancelled = futureEvent();
        cancelled.cancel();
        assertThatThrownBy(cancelled::publish)
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("CANNOT_PUBLISH");

        Event completed = futureEvent();
        completed.complete();
        assertThatThrownBy(completed::cancel)
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("CANNOT_CANCEL");
    }


    @Test
    void releasingCapacityNeverReopensTerminalEvents() {
        Event event = futureEvent();
        event.updateCapacity(2);
        event.publish();
        event.holdAttendees(2);
        event.complete();
        event.updateCapacity(2);
        assertThat(event.getStatus()).isEqualTo(EventStatus.COMPLETED);
        event.releaseHeldAttendees(1);
        assertThat(event.getStatus()).isEqualTo(EventStatus.COMPLETED);

        Event cancelled = futureEvent();
        cancelled.updateCapacity(2);
        cancelled.publish();
        cancelled.holdAttendees(2);
        cancelled.cancel();
        assertThat(cancelled.getCapacity().getHeldAttendees()).isZero();
        assertThatThrownBy(() -> cancelled.confirmHeldAttendees(1)).isInstanceOf(DomainException.class);
    }

    private Event futureEvent() {
        Instant start = Instant.now().plus(1, ChronoUnit.DAYS);
        return Event.create(
                "Tasting", EventType.TASTING,
                EventDateRange.of(start, start.plus(2, ChronoUnit.HOURS)),
                UUID.randomUUID());
    }
}
