package com.vinnot.payment.infrastructure.gateway;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import com.vinnot.payment.application.port.out.SellerAuthorizationGateway;
import com.vinnot.payment.application.service.PaymentExecutionPolicy;
import com.vinnot.payment.domain.model.SellerCredentials;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;

import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Clock;
import java.util.Map;
import java.util.Objects;
import com.vinnot.payment.application.port.out.SellerCredentialRenewalGateway;
import com.vinnot.payment.domain.model.PaymentAuthorizationRevokedException;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.ObjectMapper;

public final class MercadoPagoAuthorizationAdapter
        implements SellerAuthorizationGateway,
                SellerCredentialRenewalGateway {
    private static final long MAXIMUM_TOKEN_SECONDS = 366L * 24 * 60 * 60;
    private final RestClient client;
    private final PaymentExecutionPolicy policy;
    private final String clientId;
    private final String clientSecret;
    private final URI redirectUri;
    private final Clock clock;

    public MercadoPagoAuthorizationAdapter(
            RestClient client, String clientId, String clientSecret, URI redirectUri, Clock clock) {
        this(client, clientId, clientSecret, redirectUri, clock, PaymentExecutionPolicy.sandbox());
    }

    public MercadoPagoAuthorizationAdapter(
            RestClient client,
            String clientId,
            String clientSecret,
            URI redirectUri,
            Clock clock,
            PaymentExecutionPolicy policy) {
        this.policy = policy;
        this.client = client;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.clock = clock;
    }

    @Override
    public URI authorizationUrl(String state, String challenge) {
        return UriComponentsBuilder.fromUriString("https://auth.mercadopago.com/authorization")
                .queryParam("client_id", clientId)
                .queryParam("response_type", "code")
                .queryParam("platform_id", "mp")
                .queryParam("state", state)
                .queryParam("redirect_uri", redirectUri.toString())
                .queryParam("code_challenge", challenge)
                .queryParam("code_challenge_method", "S256")
                .build()
                .encode()
                .toUri();
    }

    @Override
    public SellerCredentials exchange(String code, String verifier) {
        try {
            JsonNode response =
                    client.post()
                            .uri("/oauth/token")
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(
                                    Map.of(
                                            "client_id",
                                            clientId,
                                            "client_secret",
                                            clientSecret,
                                            "code",
                                            code,
                                            "grant_type",
                                            "authorization_code",
                                            "redirect_uri",
                                            redirectUri.toString(),
                                            "code_verifier",
                                            verifier))
                            .retrieve()
                            .body(JsonNode.class);
            var credentials = parseCredentials(response);
            MercadoPagoSellerVerifier.verify(client, credentials, policy);
            return credentials;
        } catch (RestClientException | IllegalArgumentException | JacksonException exception) {
            // Provider response bodies can contain secrets; do not chain or log the raw exception.
            throw new ExternalServiceUnavailableException(
                    "PAYMENT_PROVIDER_UNAVAILABLE",
                    "Mercado Pago could not be linked. Start the connection again in a few"
                        + " minutes.",
                    null);
        }
    }

    @Override
    public SellerCredentials renew(SellerCredentials previous) {
        try {
            JsonNode response =
                    client.post()
                            .uri("/oauth/token")
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(
                                    Map.of(
                                            "client_id",
                                            clientId,
                                            "client_secret",
                                            clientSecret,
                                            "grant_type",
                                            "refresh_token",
                                            "refresh_token",
                                            previous.refreshToken()))
                            .retrieve()
                            .body(JsonNode.class);
            var renewed = parseCredentials(response);
            if (!previous.sellerId().equals(renewed.sellerId())) {
                throw new PaymentAuthorizationRevokedException();
            }
            return renewed;
        } catch (RestClientResponseException rejected) {
            // Only definitive invalid grants disable the account. Rate limits/network errors retain
            // retryability.
            if ((rejected.getStatusCode().equals(HttpStatus.UNAUTHORIZED)
                    || rejected.getStatusCode().equals(HttpStatus.BAD_REQUEST))
                    && invalidGrant(rejected.getResponseBodyAsString())) {
                throw new PaymentAuthorizationRevokedException();
            }
            throw renewalUnavailable();
        } catch (RestClientException | IllegalArgumentException | JacksonException unavailable) {
            throw renewalUnavailable();
        }
    }

    private boolean invalidGrant(String body) {
        try {
            return "invalid_grant"
                    .equals(
                            new ObjectMapper()
                                    .readTree(body)
                                    .path("error")
                                    .asText());
        } catch (JacksonException invalid) {
            return false;
        }
    }

    private ExternalServiceUnavailableException renewalUnavailable() {
        return new ExternalServiceUnavailableException(
                "PAYMENT_RENEWAL_UNAVAILABLE",
                "The Mercado Pago connection could not be renewed.",
                null);
    }

    private SellerCredentials parseCredentials(JsonNode response) {
        if (Objects.isNull(response)
                || (response.has("live_mode") && !response.path("live_mode").isBoolean())
                || !"bearer".equalsIgnoreCase(response.path("token_type").asText())
                || !response.path("expires_in").canConvertToLong()
                || response.path("expires_in").asLong() <= 0
                || response.path("expires_in").asLong() > MAXIMUM_TOKEN_SECONDS) {
            throw new IllegalArgumentException("Invalid sandbox authorization response");
        }
        if (policy.isLive()
                && !response.path("live_mode").asBoolean()) {
            throw new IllegalArgumentException("Expected live authorization");
        }
        var credentials =
                new SellerCredentials(
                        response.path("user_id").asText(),
                        response.path("access_token").asText(),
                        response.path("refresh_token").asText(),
                        clock.instant().plusSeconds(response.path("expires_in").asLong()));
        return credentials;
    }
}
