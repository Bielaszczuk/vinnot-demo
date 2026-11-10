package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.out.RefundStore;
import com.vinnot.payment.domain.model.CheckoutSnapshot;
import com.vinnot.payment.domain.model.RefundIntent;

import org.springframework.transaction.annotation.Transactional;

/**
 * Records a refund the provider definitively rejected together with the organizer's email: the REJECTED state, its
 * reason and the queued notice commit in one transaction. Only an intent still SENDING under this worker's claim is
 * recorded, so a rejection never overwrites a refund another path already settled.
 */
public class RefundRejectionRecorder {
    private final RefundStore refunds;
    private final PaymentNoticeService notices;

    public RefundRejectionRecorder(RefundStore refunds, PaymentNoticeService notices) {
        this.refunds = refunds;
        this.notices = notices;
    }

    @Transactional
    public void rejected(CheckoutSnapshot snapshot, RefundIntent refund, String reason) {
        refunds.reject(refund.id(), reason)
                .ifPresent(rejection -> notices.refundRejected(snapshot, refund, reason, rejection));
    }
}
