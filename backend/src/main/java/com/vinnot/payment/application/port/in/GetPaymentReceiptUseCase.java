package com.vinnot.payment.application.port.in;
import com.vinnot.payment.domain.model.PaymentReceiptStatus;
public interface GetPaymentReceiptUseCase {
    PaymentReceiptStatus get(String token);
}
