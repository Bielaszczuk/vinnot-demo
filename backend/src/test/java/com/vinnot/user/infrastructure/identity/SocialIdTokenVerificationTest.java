package com.vinnot.user.infrastructure.identity;

import tools.jackson.databind.ObjectMapper;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.user.application.port.out.model.SocialCredential;
import com.vinnot.user.domain.valueobject.SocialProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

import static com.vinnot.user.infrastructure.identity.ProviderIdTokenFixture.APPLE_ISSUER;
import static com.vinnot.user.infrastructure.identity.ProviderIdTokenFixture.GOOGLE_ISSUER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.manyTimes;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** Signature, issuer, audience, expiry and nonce checks shared by social login and reauthentication. */
class SocialIdTokenVerificationTest {
    private static final String GOOGLE_AUDIENCE = "vinnot-google-client";
    private static final String APPLE_AUDIENCE = "com.vinnot.app";

    private final ProviderIdTokenFixture tokens = new ProviderIdTokenFixture();
    private SocialIdentityVerifierAdapter adapter;

    @BeforeEach
    void setUp() {
        RestTemplate jwkClient = new RestTemplate();
        MockRestServiceServer.bindTo(jwkClient).ignoreExpectOrder(true).build()
                .expect(manyTimes(), request -> { })
                .andRespond(withSuccess(tokens.jwks(), MediaType.APPLICATION_JSON));
        adapter = new SocialIdentityVerifierAdapter(new ObjectMapper(), RestClient.builder(), jwkClient,
                GOOGLE_AUDIENCE, APPLE_AUDIENCE, "", "", "v23.0");
    }

    @Test
    void acceptsAValidGoogleIdTokenForTheConfiguredAudience() {
        var identity = adapter.verify(google(tokens.token(GOOGLE_ISSUER, GOOGLE_AUDIENCE, "google-subject",
                Duration.ofMinutes(30))));
        assertThat(identity.provider()).isEqualTo(SocialProvider.GOOGLE);
        assertThat(identity.subject()).isEqualTo("google-subject");
    }

    @Test
    void rejectsExpiredWrongAudienceAndWrongIssuerGoogleTokens() {
        assertInvalid(google(tokens.token(GOOGLE_ISSUER, GOOGLE_AUDIENCE, "google-subject", Duration.ofMinutes(-10))));
        assertInvalid(google(tokens.token(GOOGLE_ISSUER, "another-client", "google-subject", Duration.ofMinutes(30))));
        assertInvalid(google(tokens.token(APPLE_ISSUER, GOOGLE_AUDIENCE, "google-subject", Duration.ofMinutes(30))));
    }

    @Test
    void requiresTheAppleNonceWhenTheClientSuppliesIt() {
        String token = tokens.token(APPLE_ISSUER, APPLE_AUDIENCE, "apple-subject", Duration.ofMinutes(5), "nonce");
        assertThat(adapter.verify(new SocialCredential(SocialProvider.APPLE, token, "nonce", null, null)).subject())
                .isEqualTo("apple-subject");
        assertInvalid(new SocialCredential(SocialProvider.APPLE, token, "other-nonce", null, null));
        assertInvalid(new SocialCredential(SocialProvider.APPLE,
                tokens.token(APPLE_ISSUER, GOOGLE_AUDIENCE, "apple-subject", Duration.ofMinutes(5)), null, null, null));
    }

    private SocialCredential google(String token) {
        return new SocialCredential(SocialProvider.GOOGLE, token, null, null, null);
    }

    private void assertInvalid(SocialCredential credential) {
        assertThatThrownBy(() -> adapter.verify(credential))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code").isEqualTo("INVALID_SOCIAL_CREDENTIAL");
    }
}
