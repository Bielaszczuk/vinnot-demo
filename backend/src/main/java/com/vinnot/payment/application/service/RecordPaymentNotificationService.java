package com.vinnot.payment.application.service;
import com.vinnot.payment.application.port.in.RecordPaymentNotificationUseCase;
import com.vinnot.payment.application.port.out.PaymentReconciliationQueue;
import java.util.UUID;
public final class RecordPaymentNotificationService implements RecordPaymentNotificationUseCase {
    private final PaymentReconciliationQueue queue;
    public RecordPaymentNotificationService(PaymentReconciliationQueue queue) { this.queue = queue; }
    @Override
    public void record(UUID attemptId) { queue.notify(attemptId); }
    @Override
    public void recordKnownPayment(String paymentId) { queue.notifyKnownPayment(paymentId); }
}
