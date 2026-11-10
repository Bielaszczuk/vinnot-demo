package com.vinnot.payment.application.port.out;
import com.vinnot.payment.domain.model.PaymentReceiptStatus;
import java.util.Optional;
import java.util.UUID;
public interface PaymentReceiptReader {
    Optional<PaymentReceiptStatus> find(UUID attemptId);
}
