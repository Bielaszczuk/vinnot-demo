package com.vinnot.payment.infrastructure.scheduling;

import com.vinnot.payment.application.port.in.RenewPaymentCredentialsUseCase;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.payments.enabled", havingValue = "true")
public class PaymentCredentialRenewalScheduler {
    private static final int BATCH_SIZE = 10;
    private final RenewPaymentCredentialsUseCase renewal;

    public PaymentCredentialRenewalScheduler(RenewPaymentCredentialsUseCase renewal) {
        this.renewal = renewal;
    }

    @Scheduled(
            fixedDelayString = "${app.payments.renewal-delay-ms:300000}",
            initialDelayString = "${app.payments.initial-delay-ms:30000}",
            scheduler = "paymentCredentialTaskScheduler")
    public void renew() {
        renewal.execute(BATCH_SIZE);
    }
}
