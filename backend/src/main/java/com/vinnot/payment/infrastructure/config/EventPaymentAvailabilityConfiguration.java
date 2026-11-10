package com.vinnot.payment.infrastructure.config;

import com.vinnot.event.application.port.out.PaidEventAvailability;
import com.vinnot.payment.application.port.out.SellerCredentialReader;
import com.vinnot.payment.application.service.OnlineEventPaymentAvailability;
import com.vinnot.payment.application.service.PaymentExecutionPolicy;
import java.util.Objects;
import java.util.Optional;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Composition bridge: event use cases depend only on their readiness port. */
@Configuration(proxyBeanMethods = false)
public class EventPaymentAvailabilityConfiguration {
    @Bean
    public PaidEventAvailability paidEventAvailability(ObjectProvider<SellerCredentialReader> accounts,
            ObjectProvider<PaymentExecutionPolicy> policies,
            @Value("${app.payments.enabled:false}") boolean enabled,
            @Value("${app.payments.checkout-enabled:false}") boolean checkout,
            @Value("${app.payments.settlement-enabled:false}") boolean settlement) {
        var reader = accounts.getIfAvailable();
        var policy = policies.getIfAvailable();
        return new OnlineEventPaymentAvailability(
                Objects.nonNull(reader) ? reader : owner -> Optional.empty(),
                Objects.nonNull(policy) ? policy : PaymentExecutionPolicy.sandbox(),
                enabled && checkout && settlement && Objects.nonNull(reader) && Objects.nonNull(policy));
    }
}
