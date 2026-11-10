package com.vinnot.payment.infrastructure.config;

import com.vinnot.payment.application.service.PaymentExecutionPolicy;
import com.vinnot.payment.application.port.in.DispatchTicketCheckoutUseCase;
import com.vinnot.payment.application.port.in.PrepareEventCheckoutUseCase;
import com.vinnot.payment.application.port.in.StartEventCheckoutUseCase;
import com.vinnot.payment.application.port.out.CheckoutAttemptStore;
import com.vinnot.payment.application.port.out.CheckoutEligibility;
import com.vinnot.payment.application.port.out.SellerCredentialReader;
import com.vinnot.payment.application.port.out.TicketCheckoutGateway;
import com.vinnot.payment.application.service.DispatchTicketCheckoutService;
import com.vinnot.payment.application.service.StartEventCheckoutService;
import com.vinnot.payment.infrastructure.gateway.MercadoPagoCheckoutAdapter;
import com.vinnot.shared.infrastructure.http.DeadlineHttpRequestFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import com.vinnot.payment.application.port.out.PaymentReceiptAccess;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = {"app.payments.enabled", "app.payments.settlement-enabled", "app.payments.checkout-enabled"}, havingValue = "true")
public class PaymentCheckoutConfiguration {
    private static final int CONNECT_SECONDS = 3;
    private static final int READ_SECONDS = 8;
    private static final int BODY_LIMIT = 131072;

    @Bean public TicketCheckoutGateway ticketCheckoutGateway(
            @Value("${app.payments.checkout-return-uri}") URI returnUri,
            @Value("${app.payments.notification-uri}") URI notificationUri, PaymentExecutionPolicy policy, PaymentReceiptAccess receipts) {
        return new MercadoPagoCheckoutAdapter(RestClient.builder().baseUrl("https://api.mercadopago.com")
                .requestFactory(new DeadlineHttpRequestFactory(Duration.ofSeconds(CONNECT_SECONDS),
                        Duration.ofSeconds(READ_SECONDS), BODY_LIMIT, BODY_LIMIT)).build(),
                returnUri, notificationUri, Clock.systemUTC(), policy, receipts);
    }

    @Bean public DispatchTicketCheckoutUseCase dispatchTicketCheckoutUseCase(CheckoutAttemptStore attempts,
            SellerCredentialReader credentials, TicketCheckoutGateway gateway, CheckoutEligibility eligibility) {
        return new DispatchTicketCheckoutService(attempts, credentials, gateway, Clock.systemUTC(), eligibility);
    }

    @Bean public StartEventCheckoutUseCase startEventCheckoutUseCase(PrepareEventCheckoutUseCase preparation,
            DispatchTicketCheckoutUseCase dispatch) {
        return new StartEventCheckoutService(preparation, dispatch);
    }
}
