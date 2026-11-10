package com.vinnot.payment.infrastructure.gateway;

import tools.jackson.databind.JsonNode;
import com.vinnot.payment.application.service.PaymentExecutionPolicy;
import com.vinnot.payment.application.port.out.PaymentProviderGateway;
import com.vinnot.payment.domain.model.ProviderPayment;
import com.vinnot.payment.domain.model.RefundIntent;
import com.vinnot.payment.domain.model.RefundRejectedException;
import com.vinnot.payment.domain.model.SellerCredentials;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.springframework.http.MediaType;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Preferences/Payments API sandbox adapter. Does not trust search results as settlement evidence. */
public final class MercadoPagoPaymentAdapter implements PaymentProviderGateway {
    private static final int MAXIMUM_PAYMENTS = 20;
    private static final Set<Integer> UNCERTAIN_CLIENT_ERRORS = Set.of(408, 409, 429);
    private static final String PROVIDER_CODE = "[A-Za-z0-9_.-]{1,48}";
    private final RestClient client;
    private final PaymentExecutionPolicy policy;
    public MercadoPagoPaymentAdapter(RestClient client) { this(client, PaymentExecutionPolicy.sandbox()); }
    public MercadoPagoPaymentAdapter(RestClient client, PaymentExecutionPolicy policy) {
        this.client = client;
        this.policy = policy;
    }

    @Override
    public List<String> search(UUID attemptId, SellerCredentials seller) {
        try {
            var response = client.get().uri(builder -> builder.path("/v1/payments/search")
                    .queryParam("external_reference", attemptId).queryParam("collector.id", seller.sellerId())
                    .queryParam("sort", "date_created").queryParam("criteria", "asc")
                    .queryParam("limit", MAXIMUM_PAYMENTS).queryParam("offset", 0).build())
                    .headers(headers -> headers.setBearerAuth(seller.accessToken())).retrieve().body(JsonNode.class);
            Objects.requireNonNull(response);
            var results = response.path("results");
            var total = response.path("paging").path("total");
            if (!results.isArray() || !total.isIntegralNumber() || !total.canConvertToInt() || total.asInt() < 0 || total.asInt() > MAXIMUM_PAYMENTS
                    || results.size() != total.asInt()) {
                throw new IllegalArgumentException("Incomplete or oversized payment search");
            }
            List<String> ids = new ArrayList<>();
            for (var item : results) {
                String id = numericId(item.path("id").asText());
                if (!attemptId.toString().equals(item.path("external_reference").asText())
                        || !seller.sellerId().equals(item.path("collector_id").asText()) || ids.contains(id)) {
                    throw new IllegalArgumentException("Unexpected search identity");
                }
                ids.add(id);
            }
            return List.copyOf(ids);
        } catch (RuntimeException failure) {
            throw unavailable();
        }
    }

    @Override
    public ProviderPayment read(String paymentId, SellerCredentials seller) {
        numericId(paymentId);
        try {
            var body = client.get().uri("/v1/payments/{id}", paymentId)
                    .headers(headers -> headers.setBearerAuth(seller.accessToken())).retrieve().body(JsonNode.class);
            Objects.requireNonNull(body);
            if (!paymentId.equals(body.path("id").asText()) || !seller.sellerId().equals(body.path("collector_id").asText())
                    || !body.path("live_mode").isBoolean()) {
                throw new IllegalArgumentException("Unexpected payment identity/environment");
            }
            BigDecimal fee = BigDecimal.ZERO;
            var fees = body.path("fee_details");
            if (!fees.isArray()) {
                throw new IllegalArgumentException("Missing fee details");
            }
            for (var item : fees) {
                if ("application_fee".equals(item.path("type").asText())) {
                    fee = fee.add(decimal(item.path("amount")));
                }
            }
            policy.requireAmount(seller.sellerId(), decimal(body.path("transaction_amount")), body.path("currency_id").asText());
            if (policy.isLive() && !body.path("live_mode").asBoolean()) {
                throw new IllegalArgumentException("Expected a live payment");
            }
            var approved = body.path("date_approved");
            var payment = new ProviderPayment(paymentId, UUID.fromString(body.path("external_reference").asText()), seller.sellerId(), true,
                    decimal(body.path("transaction_amount")), body.path("currency_id").asText(), fee,
                    decimal(body.path("transaction_amount_refunded")), status(body.path("status").asText()),
                    Instant.parse(body.path("date_last_updated").asText()),
                    approved.isNull() || approved.isMissingNode() ? null : Instant.parse(approved.asText()));
            // Test-user payments use the normal API and can report live_mode=true.
            MercadoPagoSellerVerifier.verify(client, seller, policy);
            return payment;
        } catch (RuntimeException failure) {
            throw unavailable();
        }
    }

    /**
     * A 4xx business error is a definite rejection ({@link RefundRejectedException}): Mercado Pago answered and moved no
     * money, for example code 2063 (payment state), 2024/15016 (too old) or {@code insufficient_money_for_refund}.
     * Timeouts (408), conflicts such as a refund already in process (409), rate limits (429), 5xx, network failures
     * and malformed bodies stay uncertain: the refund may exist, so it is verified, never sent blindly again.
     */
    @Override
    public void refund(RefundIntent intent, SellerCredentials seller) {
        numericId(intent.paymentId());
        try {
            policy.requireAmount(seller.sellerId(), intent.amount(), "ARS");
        } catch (BusinessRuleViolationException restricted) {
            throw new RefundRejectedException(restricted.getCode());
        }
        try {
            var body = client.post().uri("/v1/payments/{id}/refunds", intent.paymentId())
                    .headers(headers -> headers.setBearerAuth(seller.accessToken()))
                    .header("X-Idempotency-Key", intent.idempotencyKey()).contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("amount", intent.amount())).retrieve().body(JsonNode.class);
            Objects.requireNonNull(body);
            numericId(body.path("id").asText());
            if (!intent.paymentId().equals(body.path("payment_id").asText())
                    || decimal(body.path("amount")).compareTo(intent.amount()) != 0) {
                throw new IllegalArgumentException("Unexpected refund response");
            }
        } catch (HttpClientErrorException answered) {
            if (UNCERTAIN_CLIENT_ERRORS.contains(answered.getStatusCode().value())) {
                throw unavailable();
            }
            throw new RefundRejectedException(rejectionReason(answered));
        } catch (RuntimeException failure) {
            throw unavailable();
        }
    }

    /** Status plus Mercado Pago's own error code when it is a short token; messages may carry payer data and are dropped. */
    private static String rejectionReason(HttpClientErrorException answered) {
        String reason = "HTTP_" + answered.getStatusCode().value();
        try {
            var body = answered.getResponseBodyAs(JsonNode.class);
            if (Objects.isNull(body)) {
                return reason;
            }
            var code = body.path("cause").path(0).path("code");
            String value = code.isMissingNode() || code.isNull() ? body.path("error").asText("") : code.asText("");
            return value.matches(PROVIDER_CODE) ? reason + ":" + value : reason;
        } catch (RuntimeException unreadable) {
            return reason;
        }
    }

    private static ProviderPayment.Status status(String value) {
        return switch (value) {
            case "pending", "in_process", "authorized" -> ProviderPayment.Status.PENDING;
            case "approved" -> ProviderPayment.Status.APPROVED;
            case "rejected" -> ProviderPayment.Status.REJECTED;
            case "cancelled" -> ProviderPayment.Status.CANCELLED;
            case "refunded" -> ProviderPayment.Status.REFUNDED;
            case "charged_back" -> ProviderPayment.Status.CHARGED_BACK;
            case "in_mediation" -> ProviderPayment.Status.IN_MEDIATION;
            default -> throw new IllegalArgumentException("Unknown payment status");
        };
    }

    private static BigDecimal decimal(JsonNode value) {
        if (value.isTextual() && value.asText().matches("[0-9]{1,17}(\\.[0-9]{1,2})?")) {
            return new BigDecimal(value.asText());
        }
        if (!value.isNumber()) {
            throw new IllegalArgumentException("Expected an exact monetary amount");
        }
        return value.decimalValue();
    }

    private static String numericId(String id) {
        if (Objects.isNull(id) || !id.matches("[1-9][0-9]{0,19}")) {
            throw new IllegalArgumentException("Invalid payment identifier");
        }
        return id;
    }

    private static ExternalServiceUnavailableException unavailable() {
        return new ExternalServiceUnavailableException("PAYMENT_PROVIDER_UNAVAILABLE",
                "Estamos verificando el pago. Volvé a consultar el estado de tu reserva.", null);
    }
}
