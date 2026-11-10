package com.vinnot.payment.application.port.out;
import com.vinnot.payment.domain.model.ProviderPayment;
import com.vinnot.payment.domain.model.RefundIntent;
import com.vinnot.payment.domain.model.SellerCredentials;
import java.util.List;
import java.util.UUID;
public interface PaymentProviderGateway {
    List<String> search(UUID attemptId, SellerCredentials seller);
    ProviderPayment read(String paymentId, SellerCredentials seller);
    /** Persist the intent before calling. A successful HTTP response alone does not settle the refund. */
    void refund(RefundIntent intent, SellerCredentials seller);
}
