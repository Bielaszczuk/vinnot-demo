package com.vinnot.event.domain.valueobject;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CancellationRefundTest {
    @Test
    void onlineApprovedPaymentsAreRefundedAutomatically() {
        assertThat(CancellationRefund.of(EventPaymentStatus.APPROVED, true)).isEqualTo(CancellationRefund.ONLINE);
    }

    @Test
    void moneyPaidToTheOrganizerIsReturnedByThem() {
        assertThat(CancellationRefund.of(EventPaymentStatus.APPROVED, false)).isEqualTo(CancellationRefund.ORGANIZER);
        assertThat(CancellationRefund.of(EventPaymentStatus.REPORTED, false)).isEqualTo(CancellationRefund.ORGANIZER);
    }

    @Test
    void nothingPaidNeedsNothing() {
        for (var status : new EventPaymentStatus[] {EventPaymentStatus.NOT_REQUIRED, EventPaymentStatus.PENDING,
                EventPaymentStatus.PAY_AT_VENUE}) {
            assertThat(CancellationRefund.of(status, false)).as(status.name()).isEqualTo(CancellationRefund.NONE);
            assertThat(CancellationRefund.of(status, true)).as(status.name()).isEqualTo(CancellationRefund.NONE);
        }
    }
}
