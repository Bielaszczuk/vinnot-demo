package com.vinnot.payment.infrastructure.gateway;

import com.vinnot.payment.application.port.out.TicketCheckoutGateway;
import com.vinnot.payment.domain.model.SellerCredentials;
import com.vinnot.payment.domain.valueobject.CommissionPolicy;
import com.vinnot.payment.domain.valueobject.TicketPaymentQuote;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.math.BigDecimal;
import java.util.UUID;
import com.vinnot.payment.application.port.out.PaymentReceiptAccess;
import com.vinnot.payment.application.service.PaymentExecutionPolicy;
import java.util.Optional;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class MercadoPagoCheckoutAdapterTest {
    private static final CommissionPolicy THREE_PERCENT = new CommissionPolicy(300, "VINNOT_3_PERCENT_V1");
    private final RestClient.Builder builder = RestClient.builder().baseUrl("https://api.mercadopago.com");
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final Instant now = Instant.parse("2026-10-14T12:00:00Z");
    private final Clock clock = Clock.fixed(now, ZoneOffset.UTC);
    private final URI returnUri = URI.create("https://dev.vinnot.com/events/payment-return");
    private final URI notifications = URI.create("https://dev-api.vinnot.com/payments/webhooks/mercadopago");
    private final PaymentReceiptAccess receipts = new PaymentReceiptAccess() {
        public String issue(UUID id) { return "opaque-fixture"; }
        public Optional<UUID> verify(String token) { return Optional.empty(); }
    };
    private final MercadoPagoCheckoutAdapter adapter = new MercadoPagoCheckoutAdapter(builder.build(), returnUri, notifications, clock, PaymentExecutionPolicy.sandbox(), receipts);
    private final UUID attempt = UUID.randomUUID();
    private final UUID registration = UUID.randomUUID();
    private final UUID event = UUID.randomUUID();
    private final SellerCredentials credentials = new SellerCredentials("123", "seller-token", "refresh", now.plusSeconds(3600));
    private static final String RESPONSE = """
            {"id":"preference-123","collector_id":123,
             "sandbox_init_point":"https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=preference-123",
             "init_point":"https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=preference-123"}
            """;

    @Test
    void nativeCheckoutReturnsThroughFixedPublicBridgeForEveryOutcome() {
        var returnUrl = returnUri + "?receipt=opaque-fixture&returnToApp=true&ticketId=" + registration;
        server.expect(requestTo("https://api.mercadopago.com/checkout/preferences"))
                .andExpect(content().json("""
                    {"auto_return":"approved","back_urls":{"success":"%s","pending":"%s","failure":"%s"}}
                    """.formatted(returnUrl, returnUrl, returnUrl)))
                .andRespond(withSuccess(RESPONSE, MediaType.APPLICATION_JSON));
        adapter.create(new TicketCheckoutGateway.Request(attempt, registration, event, "Cata",
                new TicketPaymentQuote(new BigDecimal("10000"), 2, "ARS", THREE_PERCENT), now.plusSeconds(600), true), credentials);
        server.verify();
    }

    @Test
    void pilotRejectsExcessBeforeAnyProviderRequest() {
        var live = new MercadoPagoCheckoutAdapter(builder.build(), returnUri, notifications, clock,
                new PaymentExecutionPolicy(
                        PaymentExecutionPolicy.Environment.LIVE_PILOT, "123", "999"), receipts);
        assertThatThrownBy(() -> live.create(request(now.plusSeconds(600)), credentials))
                .isInstanceOf(BusinessRuleViolationException.class);
        server.verify();
    }

    @ParameterizedTest
    @EnumSource(value = PaymentExecutionPolicy.Environment.class, names = {"SANDBOX", "LIVE"})
    void sendsSnapshotAndExactFeeWithNormalTicketAmounts(PaymentExecutionPolicy.Environment environment) {
        var checkout = new MercadoPagoCheckoutAdapter(builder.build(), returnUri, notifications, clock,
                new PaymentExecutionPolicy(environment, "", "999"), receipts);
        server.expect(requestTo("https://api.mercadopago.com/checkout/preferences"))
                .andExpect(method(HttpMethod.POST)).andExpect(header("Authorization", "Bearer seller-token"))
                .andExpect(content().json("""
                        {"items":[{"id":"%s","title":"Cata","currency_id":"ARS","quantity":2,"unit_price":10000.00}],
                         "marketplace_fee":600.00,"external_reference":"%s",
                         "metadata":{"registration_id":"%s","commission_policy":"VINNOT_3_PERCENT_V1"},
                         "back_urls":{"success":"https://dev.vinnot.com/events/payment-return?receipt=opaque-fixture",
                                      "pending":"https://dev.vinnot.com/events/payment-return?receipt=opaque-fixture",
                                      "failure":"https://dev.vinnot.com/events/payment-return?receipt=opaque-fixture"},
                         "notification_url":"https://dev-api.vinnot.com/payments/webhooks/mercadopago/%s",
                         "expires":true,"expiration_date_from":"2026-10-14T12:00:00Z","expiration_date_to":"2026-10-14T12:10:00Z"}
                        """.formatted(event, attempt, registration, attempt)))
                .andRespond(withSuccess(RESPONSE, MediaType.APPLICATION_JSON));
        var result = checkout.create(request(now.plusSeconds(600)), credentials);
        assertThat(result.providerReference()).isEqualTo("preference-123");
        assertThat(result.checkoutUrl().getHost()).isEqualTo("www.mercadopago.com.ar");
        server.verify();
    }

    @Test
    void sendsTheQuotePolicyAndItsFeeNotAFixedRate() {
        server.expect(requestTo("https://api.mercadopago.com/checkout/preferences"))
                .andExpect(content().json("""
                        {"marketplace_fee":1600.00,
                         "metadata":{"registration_id":"%s","commission_policy":"VINNOT_8_PERCENT_V1"}}
                        """.formatted(registration)))
                .andRespond(withSuccess(RESPONSE, MediaType.APPLICATION_JSON));
        adapter.create(new TicketCheckoutGateway.Request(attempt, registration, event, "Cata",
                new TicketPaymentQuote(new BigDecimal("10000"), 2, "ARS", new CommissionPolicy(800, "VINNOT_8_PERCENT_V1")),
                now.plusSeconds(600), false), credentials);
        server.verify();
    }

    @Test
    void rejectsWrongSellerAndUnsafeCheckoutUrlsWithoutFallingBackToLegacySandbox() {
        for (String invalid : new String[]{"", "{}", RESPONSE.replace("collector_id\":123", "collector_id\":456"),
                RESPONSE.replace("https://www", "http://www"), RESPONSE.replace("www.mercadopago.com.ar", "evil.example"),
                RESPONSE.replace("www.mercadopago.com.ar", "www.mercadopago.com.ar:8443"),
                RESPONSE.replace("/checkout/v1/redirect", "/fake"), RESPONSE.replace("\"init_point\"", "\"missing\""),
                RESPONSE.replace("https://www", "https://user:pass@www"), RESPONSE.replace("?pref_id", "#pref_id"),
                RESPONSE.replace("\"collector_id\":123", "\"collector_id\":{\"id\":123}")}) {
            server.reset();
            server.expect(requestTo("https://api.mercadopago.com/checkout/preferences"))
                    .andRespond(withSuccess(invalid, MediaType.APPLICATION_JSON));
            assertThatThrownBy(() -> adapter.create(request(now.plusSeconds(600)), credentials))
                    .isInstanceOf(ExternalServiceUnavailableException.class).hasNoCause();
            server.verify();
        }
    }

    @Test
    void refusesExpiredReservationsOrCredentialsBeforeMakingARequest() {
        assertThatThrownBy(() -> adapter.create(request(now), credentials)).isInstanceOf(BusinessRuleViolationException.class);
        assertThatThrownBy(() -> adapter.create(request(now.plusSeconds(3600)), credentials)).isInstanceOf(BusinessRuleViolationException.class);
        server.verify();
    }

    @Test
    void unknownOutcomeNeverAutomaticallyRetriesOrExposesRawProviderDetails() {
        server.expect(requestTo("https://api.mercadopago.com/checkout/preferences"))
                .andRespond(withStatus(HttpStatus.GATEWAY_TIMEOUT).body("private seller-token"));
        assertThatThrownBy(() -> adapter.create(request(now.plusSeconds(600)), credentials))
                .isInstanceOf(ExternalServiceUnavailableException.class).hasMessageNotContaining("seller-token").hasNoCause();
        server.verify();
    }

    @Test
    void rejectsUnsafeConfiguredCallbacks() {
        for (String unsafe : new String[]{"http://dev.vinnot.com/return", "https:/no-host", "https://user:pass@dev.vinnot.com", "https://dev.vinnot.com/#fragment"}) {
            assertThatThrownBy(() -> new MercadoPagoCheckoutAdapter(builder.build(), URI.create(unsafe), notifications, clock, PaymentExecutionPolicy.sandbox(), receipts))
                    .isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> new MercadoPagoCheckoutAdapter(builder.build(), returnUri, URI.create(unsafe), clock, PaymentExecutionPolicy.sandbox(), receipts))
                    .isInstanceOf(IllegalArgumentException.class);
        }
        for (String title : new String[]{null, "", "x".repeat(251)}) {
            assertThatThrownBy(() -> new TicketCheckoutGateway.Request(attempt, registration, event, title,
                    new TicketPaymentQuote(BigDecimal.ONE, 1, "ARS", THREE_PERCENT), now)).isInstanceOf(IllegalArgumentException.class);
        }
    }

    private TicketCheckoutGateway.Request request(Instant expiry) {
        return new TicketCheckoutGateway.Request(attempt, registration, event, "Cata",
                new TicketPaymentQuote(new BigDecimal("10000"), 2, "ARS", THREE_PERCENT), expiry);
    }
}
