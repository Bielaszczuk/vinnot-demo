package com.vinnot.payment.infrastructure.gateway;

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
import com.vinnot.payment.application.service.PaymentExecutionPolicy;
import com.vinnot.payment.domain.model.PaymentAuthorizationRevokedException;
import com.vinnot.payment.domain.model.SellerCredentials;
import org.hamcrest.Matchers;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class MercadoPagoAuthorizationAdapterTest {
    private final RestClient.Builder builder = RestClient.builder().baseUrl("https://api.mercadopago.com");
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final Instant now = Instant.parse("2026-10-14T12:00:00Z");
    private final MercadoPagoAuthorizationAdapter adapter = new MercadoPagoAuthorizationAdapter(builder.build(), "123", "client-secret",
            URI.create("https://dev.vinnot.com/partner/payments/callback"), Clock.fixed(now, ZoneOffset.UTC));
    private static final String RESPONSE = """
            {"access_token":"access","refresh_token":"refresh","user_id":456,"expires_in":3600,"token_type":"bearer","live_mode":false}
            """;

    @Test
    void renewsWithoutASecondRequestAndClassifiesProviderFailures() {
        var previous = new SellerCredentials("456","old","refresh",now);
        server.expect(requestTo("https://api.mercadopago.com/oauth/token")).andExpect(method(HttpMethod.POST))
            .andExpect(content().json("{\"client_id\":\"123\",\"client_secret\":\"client-secret\",\"grant_type\":\"refresh_token\",\"refresh_token\":\"refresh\"}"))
            .andRespond(withSuccess(RESPONSE,MediaType.APPLICATION_JSON));
        assertThat(adapter.renew(previous).accessToken()).isEqualTo("access"); server.verify();
        for (String error : new String[]{"invalid_grant","invalid_client","temporarily_unavailable"}) {
            server.reset(); server.expect(requestTo("https://api.mercadopago.com/oauth/token"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).body("{\"error\":\""+error+"\"}"));
            if (error.equals("invalid_grant")) {
                assertThatThrownBy(()->adapter.renew(previous)).isInstanceOf(PaymentAuthorizationRevokedException.class);
            } else { assertThatThrownBy(()->adapter.renew(previous)).isInstanceOf(ExternalServiceUnavailableException.class).hasNoCause(); }
            server.verify();
        }
        server.reset(); server.expect(requestTo("https://api.mercadopago.com/oauth/token"))
            .andRespond(withSuccess(RESPONSE.replace("456","789"),MediaType.APPLICATION_JSON));
        assertThatThrownBy(()->adapter.renew(previous)).isInstanceOf(PaymentAuthorizationRevokedException.class);
    }

    @ParameterizedTest
    @EnumSource(value = PaymentExecutionPolicy.Environment.class, names = {"LIVE_PILOT", "LIVE"})
    void liveModesRequireRealRecipientAndLiveToken(PaymentExecutionPolicy.Environment environment) {
        var pilot = new MercadoPagoAuthorizationAdapter(builder.build(), "123", "client-secret",
                URI.create("https://dev.vinnot.com/partner/payments/callback"), Clock.fixed(now, ZoneOffset.UTC),
                new PaymentExecutionPolicy(
                        environment, "456", "123"));
        server.expect(requestTo("https://api.mercadopago.com/oauth/token"))
                .andRespond(withSuccess(RESPONSE.replace("false", "true"), MediaType.APPLICATION_JSON));
        expectTestSeller("{\"id\":456,\"site_id\":\"MLA\",\"tags\":[]}");
        assertThat(pilot.exchange("code", "verifier").sellerId()).isEqualTo("456");
        server.verify();
        server.reset();
        server.expect(requestTo("https://api.mercadopago.com/oauth/token"))
                .andRespond(withSuccess(RESPONSE, MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> pilot.exchange("code", "verifier")).isInstanceOf(ExternalServiceUnavailableException.class);
        server.verify();
    }

    @Test
    void usesExactStaticCallbackPkceAndVerifiedTestAccount() {
        var url = adapter.authorizationUrl("state", "challenge");
        assertThat(url.getHost()).isEqualTo("auth.mercadopago.com");
        assertThat(url.getQuery()).contains("state=state", "code_challenge_method=S256", "code_challenge=challenge",
                "redirect_uri=https://dev.vinnot.com/partner/payments/callback").doesNotContain("client-secret");
        server.expect(requestTo("https://api.mercadopago.com/oauth/token")).andExpect(method(HttpMethod.POST))
                .andExpect(content().string(Matchers.not(Matchers.containsString("test_token"))))
                .andExpect(content().json("""
                        {"client_id":"123","client_secret":"client-secret","code":"code","grant_type":"authorization_code",
                         "redirect_uri":"https://dev.vinnot.com/partner/payments/callback","code_verifier":"verifier"}
                        """))
                .andRespond(withSuccess(RESPONSE, MediaType.APPLICATION_JSON));
        expectTestSeller("{\"id\":456,\"site_id\":\"MLA\",\"tags\":[\"test_user\"]}");
        var credentials = adapter.exchange("code", "verifier");
        assertThat(credentials.sellerId()).isEqualTo("456");
        assertThat(credentials.expiresAt()).isEqualTo(now.plusSeconds(3600));
        server.verify();
    }

    @Test
    void refusesIncompleteAndInvalidProviderResponses() {
        for (String invalid : new String[]{"", "{}", RESPONSE.replace("false", "\"invalid\""), RESPONSE.replace("3600", "0"),
                RESPONSE.replace("3600", "999999999999"), RESPONSE.replace("3600", "\"oops\""),
                RESPONSE.replace("bearer", "other"), RESPONSE.replace("refresh", ""), RESPONSE.replace("456", "0"),
                RESPONSE.replace("\"bearer\"", "{\"type\":\"bearer\"}")}) {
            server.reset();
            server.expect(requestTo("https://api.mercadopago.com/oauth/token")).andRespond(withSuccess(invalid, MediaType.APPLICATION_JSON));
            assertThatThrownBy(() -> adapter.exchange("code", "verifier")).isInstanceOf(ExternalServiceUnavailableException.class)
                    .hasMessageNotContaining("access").hasMessageNotContaining("client-secret").hasNoCause();
            server.verify();
        }
    }

    @Test
    void doesNotRetrySingleUseCodesOrLeakProviderResponse() {
        server.expect(requestTo("https://api.mercadopago.com/oauth/token"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).body("private-access-token"));
        assertThatThrownBy(() -> adapter.exchange("code", "verifier")).isInstanceOf(ExternalServiceUnavailableException.class)
                .hasNoCause().hasMessageNotContaining("private-access-token");
        server.verify();
    }
    @Test
    void acceptsRealOAuthShapeWithoutLiveModeOnlyAfterVerifyingTestSeller() {
        server.expect(requestTo("https://api.mercadopago.com/oauth/token"))
                .andRespond(withSuccess(RESPONSE.replace(",\"live_mode\":false", ""), MediaType.APPLICATION_JSON));
        expectTestSeller("{\"id\":456,\"site_id\":\"MLA\",\"tags\":[\"test_user\"]}");
        assertThat(adapter.exchange("code", "verifier").sellerId()).isEqualTo("456");
        server.verify();
    }

    @Test
    void refusesRealMismatchedOrNonArgentineAccounts() {
        for (String identity : new String[]{"{}", "{\"id\":456,\"site_id\":\"MLA\",\"tags\":[]}",
                "{\"id\":789,\"site_id\":\"MLA\",\"tags\":[\"test_user\"]}",
                "{\"id\":456,\"site_id\":\"MLB\",\"tags\":[\"test_user\"]}",
                "{\"id\":{\"value\":456},\"site_id\":\"MLA\",\"tags\":[\"test_user\"]}"}) {
            server.reset();
            server.expect(requestTo("https://api.mercadopago.com/oauth/token"))
                    .andRespond(withSuccess(RESPONSE, MediaType.APPLICATION_JSON));
            expectTestSeller(identity);
            assertThatThrownBy(() -> adapter.exchange("code", "verifier"))
                    .isInstanceOf(ExternalServiceUnavailableException.class).hasNoCause();
            server.verify();
        }
    }

    @Test
    void acceptsNormalApiCredentialOnlyForVerifiedTestAccount() {
        server.expect(requestTo("https://api.mercadopago.com/oauth/token"))
                .andRespond(withSuccess(RESPONSE.replace("false", "true"), MediaType.APPLICATION_JSON));
        expectTestSeller("{\"id\":456,\"site_id\":\"MLA\",\"tags\":[\"test_user\"]}");
        assertThat(adapter.exchange("code", "verifier").sellerId()).isEqualTo("456");
        server.verify();
    }

    private void expectTestSeller(String identity) {
        server.expect(requestTo("https://api.mercadopago.com/users/me"))
                .andExpect(method(HttpMethod.GET)).andExpect(header("Authorization", "Bearer access"))
                .andRespond(withSuccess(identity, MediaType.APPLICATION_JSON));
    }

}
