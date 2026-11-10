package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.out.RefundStore;
import com.vinnot.payment.domain.model.CheckoutSnapshot;
import com.vinnot.payment.domain.model.RefundIntent;
import com.vinnot.payment.domain.valueobject.CommissionPolicy;
import com.vinnot.payment.domain.valueobject.TicketPaymentQuote;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.OptionalInt;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class RefundRejectionRecorderTest {
    private final RefundStore refunds = mock(RefundStore.class);
    private final PaymentNoticeService notices = mock(PaymentNoticeService.class);
    private final RefundRejectionRecorder recorder = new RefundRejectionRecorder(refunds, notices);
    private final CheckoutSnapshot snapshot = new CheckoutSnapshot(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            UUID.randomUUID(), UUID.randomUUID(), "123", "Cata", new TicketPaymentQuote(new BigDecimal("10000"), 1, "ARS", CommissionPolicy.DEFAULT),
            Instant.now().plusSeconds(600));
    private final RefundIntent refund = new RefundIntent(UUID.randomUUID(), snapshot.id(), "77", new BigDecimal("10000.00"),
            RefundIntent.Status.SENDING);

    @Test
    void theOrganizerIsToldOfEachRejectionTheStoreRecords() {
        when(refunds.reject(refund.id(), "HTTP_400:2063")).thenReturn(OptionalInt.of(3));
        recorder.rejected(snapshot, refund, "HTTP_400:2063");
        verify(notices).refundRejected(snapshot, refund, "HTTP_400:2063", 3);
    }

    @Test
    void aRefundThatIsNoLongerBeingSentIsNotReported() {
        when(refunds.reject(refund.id(), "HTTP_400:2063")).thenReturn(OptionalInt.empty());
        recorder.rejected(snapshot, refund, "HTTP_400:2063");
        verifyNoInteractions(notices);
    }
}
