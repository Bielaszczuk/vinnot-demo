package com.vinnot.user.infrastructure.identity;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestTemplate;

import java.security.KeyPairGenerator;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import org.hamcrest.Matchers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;

class AppleAuthorizationRevocationAdapterTest {

    private static final String CLIENT_ID = "com.vinnot.web";
    private static final String REDIRECT_URI = "https://dev.vinnot.com/login";

    private MockRestServiceServer server;
    private AppleAuthorizationRevocationAdapter adapter;

    @BeforeEach
    void setUp() throws Exception {
        RestClient.Builder clientBuilder = RestClient.builder();
        server = MockRestServiceServer.bindTo(clientBuilder).build();
        adapter = new AppleAuthorizationRevocationAdapter(
                clientBuilder,
                new RestTemplate(),
                CLIENT_ID,
                "TEAM123",
                "KEY123",
                privateKey(),
                REDIRECT_URI);
    }

    @Test
    void sendsAllowlistedWebRedirectUriWhenExchangingAuthorizationCode() {
        server.expect(once(), requestTo("https://appleid.apple.com/auth/token"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentType(MediaType.APPLICATION_FORM_URLENCODED))
                .andExpect(content().string(
                        Matchers.containsString(
                                "redirect_uri=https%3A%2F%2Fdev.vinnot.com%2Flogin")))
                .andRespond(withBadRequest());

        assertThatThrownBy(() ->
                adapter.revoke("code", CLIENT_ID, REDIRECT_URI, "subject"))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("APPLE_REVOCATION_FAILED");
        server.verify();
    }

    @Test
    void rejectsUnregisteredRedirectUriBeforeContactingApple() {
        assertThatThrownBy(() ->
                adapter.revoke(
                        "code",
                        CLIENT_ID,
                        "https://attacker.example/callback",
                        "subject"))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("APPLE_REVOCATION_NOT_CONFIGURED");

        server.verify();
    }

    private String privateKey() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        byte[] encoded = generator.generateKeyPair().getPrivate().getEncoded();
        return "-----BEGIN PRIVATE KEY-----\n"
                + Base64.getMimeEncoder(64, new byte[]{'\n'}).encodeToString(encoded)
                + "\n-----END PRIVATE KEY-----";
    }
}
