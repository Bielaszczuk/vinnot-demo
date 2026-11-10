package com.vinnot.payment.application.port.in;
import com.vinnot.payment.domain.model.CheckoutSnapshot;
import com.vinnot.payment.domain.model.ProviderPayment;
import com.vinnot.payment.domain.model.ReconciliationClaim;
public interface ApplyProviderPaymentUseCase {
    void apply(CheckoutSnapshot snapshot, ProviderPayment payment, ReconciliationClaim claim);
}
