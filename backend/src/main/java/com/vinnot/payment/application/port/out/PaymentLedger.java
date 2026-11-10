package com.vinnot.payment.application.port.out;
import com.vinnot.payment.domain.model.ProviderPayment;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface PaymentLedger {
    record Entry(ProviderPayment payment, boolean credited, boolean review) { }
    Optional<Entry> find(String paymentId);
    Optional<String> creditedPayment(UUID attemptId);
    List<String> knownPayments(UUID attemptId);
    void save(Entry entry);
}
