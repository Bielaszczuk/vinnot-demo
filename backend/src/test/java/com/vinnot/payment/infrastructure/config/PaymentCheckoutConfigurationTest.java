package com.vinnot.payment.infrastructure.config;

import com.vinnot.payment.application.port.in.*;
import com.vinnot.payment.application.port.out.*;
import com.vinnot.payment.infrastructure.web.EventCheckoutController;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import com.vinnot.payment.application.service.PaymentExecutionPolicy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class PaymentCheckoutConfigurationTest {
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withBean(PaymentExecutionPolicy.class, PaymentExecutionPolicy::sandbox)
            .withUserConfiguration(PaymentCheckoutConfiguration.class, EventCheckoutController.class)
            .withBean(PaymentReceiptAccess.class, () -> mock(PaymentReceiptAccess.class))
            .withBean(CheckoutAttemptStore.class, () -> mock(CheckoutAttemptStore.class))
            .withBean(CheckoutEligibility.class, () -> mock(CheckoutEligibility.class))
            .withBean(SellerCredentialReader.class, () -> mock(SellerCredentialReader.class))
            .withBean(PrepareEventCheckoutUseCase.class, () -> mock(PrepareEventCheckoutUseCase.class));

    @Test void checkoutCannotStartWithoutAllSandboxFlags() {
        runner.run(c -> assertThat(c).hasNotFailed().doesNotHaveBean(EventCheckoutController.class));
        runner.withPropertyValues("app.payments.enabled=true", "app.payments.settlement-enabled=true")
                .run(c -> assertThat(c).doesNotHaveBean(StartEventCheckoutUseCase.class));
        runner.withPropertyValues("app.payments.checkout-enabled=true")
                .run(c -> assertThat(c).doesNotHaveBean(EventCheckoutController.class));
    }

    @Test void composesDurableCheckoutOnlyWithSecureCallbackAddresses() {
        var enabled = runner.withPropertyValues("app.payments.enabled=true", "app.payments.settlement-enabled=true",
                "app.payments.checkout-enabled=true", "app.payments.notification-uri=https://dev.vinnot.com/api/payments/webhooks/mercadopago");
        enabled.withPropertyValues("app.payments.checkout-return-uri=http://unsafe.invalid/return")
                .run(c -> assertThat(c).hasFailed());
        enabled.withPropertyValues("app.payments.checkout-return-uri=https://dev.vinnot.com/payments/return")
                .run(c -> assertThat(c).hasNotFailed().hasSingleBean(StartEventCheckoutUseCase.class)
                        .hasSingleBean(DispatchTicketCheckoutUseCase.class).hasSingleBean(EventCheckoutController.class));
    }
}
