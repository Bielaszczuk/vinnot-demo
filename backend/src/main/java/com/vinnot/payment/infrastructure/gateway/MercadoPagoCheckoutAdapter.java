package com.vinnot.payment.infrastructure.gateway;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import com.vinnot.payment.application.service.PaymentExecutionPolicy;
import com.vinnot.payment.application.port.out.TicketCheckoutGateway;
import com.vinnot.payment.domain.model.SellerCredentials;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.client.RestClientException;
import java.net.URI;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import com.vinnot.payment.application.port.out.PaymentReceiptAccess;

/** Sandbox transport composed only with durable reconciliation and explicit checkout opt-in. */
public final class MercadoPagoCheckoutAdapter implements TicketCheckoutGateway {
    private final RestClient client;
    private final PaymentExecutionPolicy policy;
    private final URI returnUri;
    private final URI notificationUri;
    private final Clock clock;
    private final PaymentReceiptAccess receipts;

    public MercadoPagoCheckoutAdapter(RestClient client, URI returnUri, URI notificationUri, Clock clock,
            PaymentExecutionPolicy policy, PaymentReceiptAccess receipts) {
        this.receipts = Objects.requireNonNull(receipts);
        this.policy = policy;
        requireHttps(returnUri);
        requireHttps(notificationUri);
        this.client = client;
        this.returnUri = returnUri;
        this.notificationUri = notificationUri;
        this.clock = clock;
    }

    @Override
    public Checkout create(Request request, SellerCredentials credentials) {
        if (!request.expiresAt().isAfter(clock.instant()) || !credentials.expiresAt().isAfter(request.expiresAt())) {
            throw new BusinessRuleViolationException("PAYMENT_CHECKOUT_EXPIRED", "The reservation or the payment authorization expired.");
        }
        policy.requireAmount(credentials.sellerId(), request.quote().total(), request.quote().currency());
        try {
            var quote = request.quote();
            var returnBuilder = UriComponentsBuilder.fromUri(returnUri)
                    .queryParam("receipt", receipts.issue(request.attemptId()));
            if (request.returnToApp()) {
                returnBuilder.queryParam("returnToApp", "true").queryParam("ticketId", request.registrationId());
            }
            var returnUrl = returnBuilder.build().toUriString();
            JsonNode response = client.post().uri("/checkout/preferences")
                    .headers(headers -> headers.setBearerAuth(credentials.accessToken()))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.ofEntries(
                            Map.entry("items", List.of(Map.of("id", request.eventId().toString(), "title", request.title(),
                                    "currency_id", quote.currency(), "quantity", quote.quantity(), "unit_price", quote.unitPrice()))),
                            Map.entry("marketplace_fee", quote.commission()), Map.entry("external_reference", request.attemptId().toString()),
                            Map.entry("metadata", Map.of("registration_id", request.registrationId().toString(),
                                    "commission_policy", quote.commissionPolicy().id())),
                            Map.entry("back_urls", Map.of("success", returnUrl, "pending", returnUrl, "failure", returnUrl)),
                            Map.entry("auto_return", "approved"),
                            Map.entry("notification_url", notificationUri.toString() + "/" + request.attemptId()),
                            Map.entry("expires", true), Map.entry("expiration_date_from", clock.instant().toString()),
                            Map.entry("expiration_date_to", request.expiresAt().toString())))
                    .retrieve().body(JsonNode.class);
            if (Objects.isNull(response) || response.path("id").asText().isBlank()
                    || !credentials.sellerId().equals(response.path("collector_id").asText())) {
                throw new IllegalArgumentException("Unexpected checkout receiver");
            }
            URI url = URI.create(response.path("init_point").asText());
            requireHttps(url);
            if (!"www.mercadopago.com.ar".equals(url.getHost()) || url.getPort() != -1
                    || !"/checkout/v1/redirect".equals(url.getPath())) {
                throw new IllegalArgumentException("Unexpected sandbox checkout origin");
            }
            return new Checkout(response.path("id").asText(), url);
        } catch (RestClientException | IllegalArgumentException | JacksonException exception) {
            // A timeout may follow successful creation. Do not automatically retry this POST.
            throw new ExternalServiceUnavailableException("PAYMENT_CHECKOUT_UNCERTAIN",
                    "The payment start could not be confirmed. Check your reservation status before trying again.", null);
        }
    }

    private static void requireHttps(URI uri) {
        if (!"https".equals(uri.getScheme()) || Objects.isNull(uri.getHost()) || Objects.nonNull(uri.getUserInfo())
                || Objects.nonNull(uri.getFragment())) {
            throw new IllegalArgumentException("Payment URLs must use HTTPS without credentials or fragments");
        }
    }
}
