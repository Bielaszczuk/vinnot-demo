package com.vinnot.event.infrastructure.web.request;

import com.vinnot.event.domain.valueobject.EventCancellationReason;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CancelEventRequestTest {
    @Test
    void aMissingBodyOrReasonUsesThePreselectedReason() {
        assertThat(CancelEventRequest.toCancellation(null).reason()).isEqualTo(EventCancellationReason.UNFORESEEN_CIRCUMSTANCES);
        assertThat(CancelEventRequest.toCancellation(new CancelEventRequest(null, null)).reason())
                .isEqualTo(EventCancellationReason.UNFORESEEN_CIRCUMSTANCES);
    }

    @Test
    void theChosenReasonAndNoteReachTheCommand() {
        var cancellation = CancelEventRequest.toCancellation(new CancelEventRequest(EventCancellationReason.OTHER, " Obra en el salón "));
        assertThat(cancellation.reason()).isEqualTo(EventCancellationReason.OTHER);
        assertThat(cancellation.note()).isEqualTo("Obra en el salón");
    }
}
