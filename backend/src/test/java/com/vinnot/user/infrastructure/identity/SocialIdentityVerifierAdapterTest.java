package com.vinnot.user.infrastructure.identity;

import tools.jackson.databind.ObjectMapper;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.user.application.port.out.model.SocialCredential;
import com.vinnot.user.application.port.out.model.VerifiedSocialIdentity;
import com.vinnot.user.domain.valueobject.SocialProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class SocialIdentityVerifierAdapterTest {

    private static final String APP_ID = "facebook-app-id";
    private static final String APP_SECRET = "facebook-app-secret";
    private static final String USER_TOKEN = "facebook-user-token";

    private MockRestServiceServer server;
    private SocialIdentityVerifierAdapter adapter;

    @BeforeEach
    void setUp() {
        RestClient.Builder clientBuilder = RestClient.builder();
        server = MockRestServiceServer.bindTo(clientBuilder).build();
        adapter = new SocialIdentityVerifierAdapter(
                new ObjectMapper(), clientBuilder, new RestTemplate(),
                "", "", APP_ID, APP_SECRET, "v23.0");
    }

    @Test
    void verifiesFacebookTokenAndMapsProviderProfile() {
        server.expect(once(), request -> {
                    assertThat(request.getURI().getPath()).isEqualTo("/v23.0/debug_token");
                    assertThat(request.getURI().getQuery())
                            .contains("input_token=" + USER_TOKEN);
                    assertThat(request.getURI().getQuery())
                            .contains("access_token=" + APP_ID);
                })
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("""
                        {"data":{"app_id":"facebook-app-id","type":"USER",
                        "is_valid":true,"user_id":"facebook-user-id"}}
                        """, MediaType.APPLICATION_JSON));
        server.expect(once(), request -> {
                    assertThat(request.getURI().getPath()).isEqualTo("/v23.0/me");
                    assertThat(request.getURI().getQuery())
                            .contains("access_token=" + USER_TOKEN);
                })
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("""
                        {"id":"facebook-user-id","email":"user@example.com",
                        "first_name":"Wine","last_name":"Lover",
                        "picture":{"data":{"url":"https://images.example/avatar.jpg"}}}
                        """, MediaType.APPLICATION_JSON));

        VerifiedSocialIdentity identity = adapter.verify(credential(USER_TOKEN));

        assertThat(identity.provider()).isEqualTo(SocialProvider.FACEBOOK);
        assertThat(identity.subject()).isEqualTo("facebook-user-id");
        assertThat(identity.email()).isEqualTo("user@example.com");
        assertThat(identity.emailVerified()).isTrue();
        assertThat(identity.firstName()).isEqualTo("Wine");
        assertThat(identity.lastName()).isEqualTo("Lover");
        assertThat(identity.profileImageUrl())
                .isEqualTo("https://images.example/avatar.jpg");
        server.verify();
    }

    @Test
    void rejectsInvalidFacebookTokenBeforeRequestingProfile() {
        server.expect(once(), request ->
                        assertThat(request.getURI().getPath())
                                .isEqualTo("/v23.0/debug_token"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("""
                        {"data":{"is_valid":false,"error":{"code":190}}}
                        """, MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> adapter.verify(credential("invalid-token")))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("INVALID_SOCIAL_CREDENTIAL");
        server.verify();
    }

    private SocialCredential credential(String token) {
        return new SocialCredential(SocialProvider.FACEBOOK, token, null, null, null);
    }
}
