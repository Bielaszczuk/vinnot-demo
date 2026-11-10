package com.vinnot.event.domain.valueobject;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EventCancellationTest {
    @Test
    void noChoiceMeansThePreselectedReason() {
        assertThat(EventCancellation.unspecified().reason()).isEqualTo(EventCancellationReason.UNFORESEEN_CIRCUMSTANCES);
        assertThat(new EventCancellation(null, "note").reason()).isEqualTo(EventCancellationReason.UNFORESEEN_CIRCUMSTANCES);
    }

    @Test
    void aNoteIsKeptTrimmedOnlyForOther() {
        assertThat(new EventCancellation(EventCancellationReason.OTHER, "  Sommelier enfermo ").note()).isEqualTo("Sommelier enfermo");
        assertThat(new EventCancellation(EventCancellationReason.OTHER, "   ").note()).isNull();
        assertThat(new EventCancellation(EventCancellationReason.WEATHER, "Lluvia").note()).isNull();
    }

    @Test
    void aNoteHasABoundedLength() {
        assertThat(new EventCancellation(EventCancellationReason.OTHER, "a".repeat(280)).note()).hasSize(280);
        assertThatThrownBy(() -> new EventCancellation(EventCancellationReason.OTHER, "a".repeat(281)))
                .isInstanceOf(DomainException.class).extracting("code").isEqualTo("CANCELLATION_NOTE_TOO_LONG");
    }
}
