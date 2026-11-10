package com.vinnot.payment.infrastructure.scheduling;
import com.vinnot.payment.application.port.in.ReconcilePaymentsUseCase;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = {"app.payments.enabled", "app.payments.settlement-enabled"}, havingValue = "true")
public class PaymentReconciliationScheduler {
    private final ReconcilePaymentsUseCase reconciliation;
    public PaymentReconciliationScheduler(ReconcilePaymentsUseCase reconciliation) { this.reconciliation = reconciliation; }
    @Scheduled(scheduler = "paymentTaskScheduler", initialDelayString = "${app.payments.initial-delay-ms:60000}", fixedDelayString = "${app.payments.poll-delay-ms:60000}")
    public void run() { reconciliation.execute(10); }
}
