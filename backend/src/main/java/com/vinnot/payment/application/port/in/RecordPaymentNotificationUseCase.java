package com.vinnot.payment.application.port.in;
import java.util.UUID;
public interface RecordPaymentNotificationUseCase {
    void record(UUID attemptId);
    /** Application-level fallback for already observed provider payments. */
    void recordKnownPayment(String paymentId);
}
