package com.vinnot.event.domain.valueobject;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EventCapacityTest {

    @Test
    void holdsAndConfirmsAGroupWithoutPartiallyAllocatingCapacity() {
        EventCapacity held = EventCapacity.withLimit(5).hold(3);

        assertThat(held.getCurrentAttendees()).isZero();
        assertThat(held.getHeldAttendees()).isEqualTo(3);
        assertThat(held.getAvailableSpots()).isEqualTo(2);

        assertThatThrownBy(() -> held.hold(3))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("EVENT_SOLD_OUT");

        EventCapacity confirmed = held.confirmHold(3);

        assertThat(confirmed.getCurrentAttendees()).isEqualTo(3);
        assertThat(confirmed.getHeldAttendees()).isZero();
        assertThat(confirmed.getAvailableSpots()).isEqualTo(2);
    }

    @Test
    void releasesHeldAndConfirmedCapacityIndependently() {
        EventCapacity capacity = EventCapacity.of(8, 3, 4);

        EventCapacity releasedHold = capacity.releaseHold(2);
        EventCapacity releasedConfirmed = releasedHold.releaseConfirmed(1);

        assertThat(releasedConfirmed.getCurrentAttendees()).isEqualTo(2);
        assertThat(releasedConfirmed.getHeldAttendees()).isEqualTo(2);
        assertThat(releasedConfirmed.getAvailableSpots()).isEqualTo(4);
    }

    @Test
    void rejectsReleasingMoreCapacityThanWasAllocated() {
        EventCapacity capacity = EventCapacity.of(10, 2, 1);

        assertThatThrownBy(() -> capacity.releaseHold(2))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_CAPACITY_RELEASE");
        assertThatThrownBy(() -> capacity.releaseConfirmed(3))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_CAPACITY_RELEASE");
    }
}
