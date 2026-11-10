package com.vinnot.payment.application.service;
import com.vinnot.payment.application.port.in.GetPaymentReceiptUseCase;
import com.vinnot.payment.application.port.out.PaymentReceiptAccess;
import com.vinnot.payment.application.port.out.PaymentReceiptReader;
import com.vinnot.payment.domain.model.PaymentReceiptStatus;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
public class GetPaymentReceiptService implements GetPaymentReceiptUseCase {
    private final PaymentReceiptAccess access;
    private final PaymentReceiptReader reader;
    public GetPaymentReceiptService(PaymentReceiptAccess access, PaymentReceiptReader reader) {
        this.access = access;
        this.reader = reader;
    }
    @Override
    public PaymentReceiptStatus get(String token) {
        return access.verify(token).flatMap(reader::find)
                .orElseThrow(() -> new EntityNotFoundException("PaymentReceipt", "unavailable"));
    }
}
