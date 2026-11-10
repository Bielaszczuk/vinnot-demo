package com.vinnot.payment.infrastructure.gateway;
import com.vinnot.payment.domain.model.ProviderPayment;
import com.vinnot.payment.domain.model.RefundIntent;
import com.vinnot.payment.domain.model.RefundRejectedException;
import com.vinnot.payment.domain.model.SellerCredentials;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import java.math.BigDecimal;
import java.time.Instant;
import java.math.BigDecimal;
import java.util.UUID;
import com.vinnot.payment.application.service.PaymentExecutionPolicy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withRawStatus;

class MercadoPagoPaymentAdapterTest {
    private final RestClient.Builder builder = RestClient.builder().baseUrl("https://api.mercadopago.com");
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final MercadoPagoPaymentAdapter adapter = new MercadoPagoPaymentAdapter(builder.build());
    private final UUID attempt = UUID.randomUUID();
    private final SellerCredentials seller = new SellerCredentials("123", "fixture-access", "fixture-refresh", Instant.now().plusSeconds(3600));
    private String payment() {
        return """
                {"id":456,"collector_id":123,"live_mode":false,"external_reference":"%s","transaction_amount":20000,
                 "currency_id":"ARS","fee_details":[{"type":"application_fee","amount":600},{"type":"mercadopago_fee","amount":100}],
                 "transaction_amount_refunded":0,"status":"approved","date_last_updated":"2026-10-15T12:00:00Z","date_approved":"2026-10-15T11:59:00Z"}
                """.formatted(attempt);
    }
    @Test void livePilotRequiresRecipientIdentityLiveModeAndCap() {
        var live = new MercadoPagoPaymentAdapter(builder.build(), new PaymentExecutionPolicy(
                PaymentExecutionPolicy.Environment.LIVE_PILOT, "123", "999"));
        String body = payment().replace("20000", "50").replace("600", "1.50").replace("live_mode\":false", "live_mode\":true");
        expectRead(body);
        expectTestSeller("{\"id\":123,\"site_id\":\"MLA\",\"tags\":[]}");
        assertThat(live.read("456", seller).applicationFee()).isEqualByComparingTo("1.50");
        server.verify();
        server.reset(); expectRead(body); expectTestSeller("{\"id\":123,\"site_id\":\"MLA\",\"tags\":[\"test_user\"]}");
        assertThatThrownBy(() -> live.read("456", seller)).isInstanceOf(ExternalServiceUnavailableException.class);
        for (String invalid : new String[]{body.replace("live_mode\":true", "live_mode\":false"), body.replace("transaction_amount\":50", "transaction_amount\":51")}) {
            server.reset(); expectRead(invalid);
            assertThatThrownBy(() -> live.read("456", seller)).isInstanceOf(ExternalServiceUnavailableException.class);
            server.verify();
        }
    }
    @Test void productionReadsAndRefundsNormalAmountsWithSellerBoundIdempotency() {
        var live = new MercadoPagoPaymentAdapter(builder.build(), new PaymentExecutionPolicy(
                PaymentExecutionPolicy.Environment.LIVE, "", "999"));
        expectRead(payment().replace("live_mode\":false", "live_mode\":true"));
        expectTestSeller("{\"id\":123,\"site_id\":\"MLA\",\"tags\":[]}");
        var result = live.read("456", seller);
        assertThat(result.amount()).isEqualByComparingTo("20000");
        assertThat(result.applicationFee()).isEqualByComparingTo("600");
        server.verify();
        server.reset();
        var refund = new RefundIntent(UUID.randomUUID(), attempt, "456", new BigDecimal("20000"), RefundIntent.Status.SENDING);
        server.expect(requestTo("https://api.mercadopago.com/v1/payments/456/refunds"))
                .andExpect(header("Authorization", "Bearer fixture-access"))
                .andExpect(header("X-Idempotency-Key", refund.id().toString()))
                .andExpect(content().json("{\"amount\":20000}"))
                .andRespond(withSuccess("{\"id\":789,\"payment_id\":456,\"amount\":20000}", MediaType.APPLICATION_JSON));
        live.refund(refund, seller);
        server.verify();
        server.reset(); expectRead(payment());
        assertThatThrownBy(() -> live.read("456", seller)).isInstanceOf(ExternalServiceUnavailableException.class);
        server.verify();
    }
    @Test void readsAuthoritativePaymentWithoutRetainingPayerDataAndMapsAllStatuses() {
        for (String status : new String[]{"approved", "pending", "in_process", "authorized", "rejected", "cancelled", "refunded", "charged_back", "in_mediation"}) {
            server.reset();
            expectRead(payment().replace("\"approved\"", "\"" + status + "\""));
            expectTestSeller("{\"id\":123,\"site_id\":\"MLA\",\"tags\":[\"test_user\"]}");
            var result = adapter.read("456", seller);
            assertThat(result.amount()).isEqualByComparingTo("20000");
            assertThat(result.applicationFee()).isEqualByComparingTo("600");
            assertThat(result.attemptId()).isEqualTo(attempt);
            server.verify();
        }
        server.reset();
        expectRead(payment().replace("20000", "\"20000.00\"").replace("\"approved\"", "\"pending\"").replace("\"2026-10-15T11:59:00Z\"", "null"));
        expectTestSeller("{\"id\":123,\"site_id\":\"MLA\",\"tags\":[\"test_user\"]}");
        assertThat(adapter.read("456", seller).approvedAt()).isNull();
    }
    @Test void failsClosedOnIdentityLiveMoneyStatusAndMalformedResponsesWithoutExposingProviderBody() {
        for (String invalid : new String[]{"", "{}", payment().replace("\"id\":456", "\"id\":457"), payment().replace("collector_id\":123", "collector_id\":124"),
                payment().replace("live_mode\":false", "live_mode\":\"false\""),
                payment().replace("20000", "\"NaN\""), payment().replace("fee_details", "missing"), payment().replace("approved\"", "unexpected\""),
                payment().replace("20000", "20000.001"), payment().replace("\"2026-10-15T11:59:00Z\"", "null")}) {
            server.reset(); expectRead(invalid);
            assertThatThrownBy(() -> adapter.read("456", seller)).isInstanceOf(ExternalServiceUnavailableException.class).hasNoCause();
        }
        assertThatThrownBy(() -> adapter.read("../secret", seller)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void searchesOnlyServerReferenceAndSellerAndRefusesTruncatedOrDuplicateResults() {
        String url = "https://api.mercadopago.com/v1/payments/search?external_reference=" + attempt + "&collector.id=123&sort=date_created&criteria=asc&limit=20&offset=0";
        String item = "{\"id\":456,\"external_reference\":\"" + attempt + "\",\"collector_id\":123}";
        server.expect(requestTo(url)).andExpect(header("Authorization", "Bearer fixture-access"))
                .andRespond(withSuccess("{\"paging\":{\"total\":1},\"results\":[" + item + "]}", MediaType.APPLICATION_JSON));
        assertThat(adapter.search(attempt, seller)).containsExactly("456");
        for (String invalid : new String[]{"{}", "{\"paging\":{\"total\":21},\"results\":[]}", "{\"paging\":{\"total\":1},\"results\":[]}",
                "{\"paging\":{\"total\":2},\"results\":[" + item + "," + item + "]}",
                "{\"paging\":{\"total\":1},\"results\":[" + item.replace("123}","999}") + "]}"}) {
            server.reset(); server.expect(requestTo(url)).andRespond(withSuccess(invalid, MediaType.APPLICATION_JSON));
            assertThatThrownBy(() -> adapter.search(attempt, seller)).isInstanceOf(ExternalServiceUnavailableException.class);
        }
    }
    @Test void refundUsesStoredKeyAndAmountAndDoesNotRetryUncertainHttpFailure() {
        var refund = new RefundIntent(UUID.randomUUID(), attempt, "456", new BigDecimal("20000"), RefundIntent.Status.SENDING);
        server.expect(requestTo("https://api.mercadopago.com/v1/payments/456/refunds")).andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer fixture-access")).andExpect(header("X-Idempotency-Key", refund.id().toString()))
                .andExpect(content().json("{\"amount\":20000}"))
                .andRespond(withSuccess("{\"id\":789,\"payment_id\":456,\"amount\":20000}", MediaType.APPLICATION_JSON));
        adapter.refund(refund, seller); server.verify();
        server.reset(); server.expect(requestTo("https://api.mercadopago.com/v1/payments/456/refunds")).andRespond(withServerError());
        assertThatThrownBy(() -> adapter.refund(refund, seller)).isInstanceOf(ExternalServiceUnavailableException.class).hasNoCause();
        server.verify();
        server.reset(); server.expect(requestTo("https://api.mercadopago.com/v1/payments/456/refunds"))
                .andRespond(withSuccess("{\"id\":789,\"payment_id\":999,\"amount\":1}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> adapter.refund(refund, seller)).isInstanceOf(ExternalServiceUnavailableException.class);
    }
    @Test void aRetryAfterARejectionSendsItsOwnIdempotencyKey() {
        var refund = new RefundIntent(UUID.randomUUID(), attempt, "456", new BigDecimal("20000"), RefundIntent.Status.SENDING, 2);
        server.expect(requestTo("https://api.mercadopago.com/v1/payments/456/refunds"))
                .andExpect(header("X-Idempotency-Key", refund.id() + "-retry-2"))
                .andRespond(withSuccess("{\"id\":789,\"payment_id\":456,\"amount\":20000}", MediaType.APPLICATION_JSON));
        adapter.refund(refund, seller);
        server.verify();
    }
    @Test void aBusinessErrorFromMercadoPagoIsADefiniteRejectionThatKeepsOnlyStatusAndCode() {
        var refund = new RefundIntent(UUID.randomUUID(), attempt, "456", new BigDecimal("20000"), RefundIntent.Status.SENDING);
        record Case(int status, String body, String reason) { }
        for (var rejection : new Case[]{
                new Case(400, "{\"message\":\"The action requested is not valid for the current payment state\",\"error\":\"bad_request\","
                        + "\"status\":400,\"cause\":[{\"code\":2063,\"description\":\"Payer ana@example.test\"}]}", "HTTP_400:2063"),
                new Case(428, "{\"error\":\"insufficient_money_for_refund\",\"message\":\"Not enough money\"}",
                        "HTTP_428:insufficient_money_for_refund"),
                new Case(404, "{\"message\":\"Payment too old\",\"cause\":[{\"code\":\"15016\"}]}", "HTTP_404:15016"),
                new Case(422, "not json", "HTTP_422"),
                new Case(401, "{\"error\":\"<script>alert(1)</script>\"}", "HTTP_401")}) {
            server.reset();
            server.expect(requestTo("https://api.mercadopago.com/v1/payments/456/refunds"))
                    .andExpect(header("X-Idempotency-Key", refund.id().toString()))
                    .andRespond(withRawStatus(rejection.status()).contentType(MediaType.APPLICATION_JSON).body(rejection.body()));
            assertThatThrownBy(() -> adapter.refund(refund, seller)).isInstanceOfSatisfying(RefundRejectedException.class, failure -> {
                assertThat(failure.reason()).isEqualTo(rejection.reason());
                assertThat(failure.getMessage()).doesNotContain("ana@example.test", "Not enough money");
            }).hasNoCause();
            server.verify();
        }
    }
    @Test void timeoutsConflictsRateLimitsAndServerErrorsStayUncertain() {
        var refund = new RefundIntent(UUID.randomUUID(), attempt, "456", new BigDecimal("20000"), RefundIntent.Status.SENDING);
        for (int status : new int[]{408, 409, 429, 500, 502, 503}) {
            server.reset();
            server.expect(requestTo("https://api.mercadopago.com/v1/payments/456/refunds"))
                    .andRespond(withRawStatus(status).contentType(MediaType.APPLICATION_JSON).body("{\"error\":\"refund_in_progress\"}"));
            assertThatThrownBy(() -> adapter.refund(refund, seller)).isInstanceOf(ExternalServiceUnavailableException.class)
                    .isNotInstanceOf(RefundRejectedException.class);
            server.verify();
        }
    }
    @Test void aLivePilotRefundOverTheLimitIsRejectedWithItsCauseBeforeAnyRequest() {
        var live = new MercadoPagoPaymentAdapter(builder.build(), new PaymentExecutionPolicy(
                PaymentExecutionPolicy.Environment.LIVE_PILOT, "123", "999"));
        var refund = new RefundIntent(UUID.randomUUID(), attempt, "456", new BigDecimal("51"), RefundIntent.Status.SENDING);
        assertThatThrownBy(() -> live.refund(refund, seller)).isInstanceOfSatisfying(RefundRejectedException.class,
                failure -> assertThat(failure.reason()).isEqualTo("PAYMENT_PILOT_RESTRICTED"));
        server.verify();
    }
    @Test void acceptsNormalApiTestPaymentsButRejectsRealOrMismatchedAccounts() {
        expectRead(payment().replace("live_mode\":false", "live_mode\":true"));
        expectTestSeller("{\"id\":123,\"site_id\":\"MLA\",\"tags\":[\"test_user\"]}");
        assertThat(adapter.read("456", seller).accountEnvironmentVerified()).isTrue();
        server.verify();
        for (String identity : new String[]{"{}", "{\"id\":123,\"site_id\":\"MLA\",\"tags\":[]}",
                "{\"id\":999,\"site_id\":\"MLA\",\"tags\":[\"test_user\"]}",
                "{\"id\":123,\"site_id\":\"MLB\",\"tags\":[\"test_user\"]}"}) {
            server.reset(); expectRead(payment()); expectTestSeller(identity);
            assertThatThrownBy(() -> adapter.read("456", seller)).isInstanceOf(ExternalServiceUnavailableException.class);
            server.verify();
        }
    }
    private void expectTestSeller(String identity) {
        server.expect(requestTo("https://api.mercadopago.com/users/me"))
                .andExpect(header("Authorization", "Bearer fixture-access"))
                .andRespond(withSuccess(identity, MediaType.APPLICATION_JSON));
    }
    private void expectRead(String response) {
        server.expect(requestTo("https://api.mercadopago.com/v1/payments/456")).andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer fixture-access")).andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
    }
}
