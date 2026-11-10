package com.vinnot.user.infrastructure.web;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.vinnot.shared.application.port.TokenService;
import com.vinnot.user.infrastructure.identity.ProviderIdTokenFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.client.RestOperations;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import static com.vinnot.user.infrastructure.identity.ProviderIdTokenFixture.GOOGLE_ISSUER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/** A social-only account confirms its identity with its provider; real HTTP, verification and PostgreSQL. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "server.address=127.0.0.1", "ai.provider=mock", "ai.enabled=false",
        "ai.spending.paid-calls-enabled=false", "app.auth.email.provider=log",
        "app.storage.provider=local", "app.cors.allowed-origins=https://vinnot.com",
        "app.observability.snapshot.enabled=false", "app.effects.poll-ms=3600000",
        "app.auth.social.google.audiences=" + ProviderReauthenticationHttpPostgresIntegrationTest.AUDIENCE
})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ProviderReauthenticationHttpPostgresIntegrationTest {
    static final String AUDIENCE = "vinnot-google-test-client";
    private static final String SIGNING_KEY = UUID.randomUUID().toString() + UUID.randomUUID();
    private static final ProviderIdTokenFixture TOKENS = new ProviderIdTokenFixture();

    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    @MockitoBean(name = "socialJwkRestOperations") RestOperations jwkClient;
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @Autowired TokenService tokens;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("jwt.secret", () -> SIGNING_KEY);
    }

    @BeforeEach
    void serveProviderKeys() {
        when(jwkClient.exchange(any(RequestEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok(TOKENS.jwks()));
    }

    @Test
    void socialOnlyAccountChangesEmailAndDeletesItselfWithAFreshGoogleToken() throws Exception {
        UUID member = socialOnlyAccount("google-" + UUID.randomUUID());
        String access = bearer(member);
        var emailChange = Map.of("newEmail", UUID.randomUUID() + "@example.org");

        var confirmation = request("POST", "/auth/reauthenticate", access,
                Map.of("provider", "GOOGLE", "token", google(subject(member), Duration.ofMinutes(30))));
        assertThat(confirmation.statusCode()).isEqualTo(200);
        assertThat(confirmation.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        String proof = json(confirmation).get("proof").asText();

        assertThat(request("POST", "/users/me/email-change", access, emailChange,
                "X-Admin-Reauthentication", proof).statusCode()).isEqualTo(200);
        assertThat(request("DELETE", "/users/me/permanent", access, null,
                "X-Admin-Reauthentication", proof).statusCode()).isEqualTo(204);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE id=?", Long.class, member)).isZero();
    }

    @Test
    void rejectsExpiredWrongAudienceOtherUserAndUnlinkedProviderTokens() throws Exception {
        UUID member = socialOnlyAccount("google-" + UUID.randomUUID());
        UUID other = socialOnlyAccount("google-" + UUID.randomUUID());
        String access = bearer(member);

        for (String token : List.of(
                google(subject(member), Duration.ofMinutes(-10)),
                TOKENS.token(GOOGLE_ISSUER, "another-client", subject(member), Duration.ofMinutes(30)),
                google(subject(other), Duration.ofMinutes(30)),
                google("unlinked-" + UUID.randomUUID(), Duration.ofMinutes(30)))) {
            var denied = request("POST", "/auth/reauthenticate", access, Map.of("provider", "GOOGLE", "token", token));
            assertThat(denied.statusCode()).isEqualTo(401);
            assertThat(json(denied).get("code").asText()).isEqualTo("AUTH_FAILED");
            assertThat(json(denied).has("proof")).isFalse();
        }
    }

    @Test
    void requiresExactlyOneCredential() throws Exception {
        UUID member = socialOnlyAccount("google-" + UUID.randomUUID());
        String access = bearer(member);
        var both = new HashMap<String, Object>(Map.of("password", "secret", "provider", "GOOGLE",
                "token", google(subject(member), Duration.ofMinutes(30))));

        assertThat(request("POST", "/auth/reauthenticate", access, both).statusCode()).isEqualTo(400);
        assertThat(request("POST", "/auth/reauthenticate", access, Map.of()).statusCode()).isEqualTo(400);
        assertThat(request("POST", "/auth/reauthenticate", access, Map.of("provider", "GOOGLE")).statusCode())
                .isEqualTo(400);
    }

    private String google(String subject, Duration expiresIn) {
        return TOKENS.token(GOOGLE_ISSUER, AUDIENCE, subject, expiresIn);
    }

    private String subject(UUID userId) {
        return jdbc.queryForObject("SELECT provider_subject FROM social_identities WHERE user_id=?", String.class, userId);
    }

    private UUID socialOnlyAccount(String subject) {
        UUID id = UUID.randomUUID();
        String email = id + "@example.org";
        jdbc.update("""
                INSERT INTO users(id,username,email,password,first_name,last_name,email_verified)
                VALUES (?,?,?,?,'Social','Fixture',true)
                """, id, id.toString(), email, "unusable-" + UUID.randomUUID());
        jdbc.update("INSERT INTO user_roles(user_id,role_id) SELECT ?,id FROM roles WHERE name='ROLE_USER'", id);
        jdbc.update("""
                INSERT INTO social_identities(id,user_id,provider,provider_subject,provider_email,created_at,updated_at)
                VALUES (?,?,'GOOGLE',?,?,now(),now())
                """, UUID.randomUUID(), id, subject, email);
        return id;
    }

    private String bearer(UUID id) {
        List<String> permissions = jdbc.queryForList("""
                SELECT DISTINCT p.code FROM permissions p JOIN role_permissions rp ON rp.permission_id = p.id
                JOIN user_roles ur ON ur.role_id = rp.role_id WHERE ur.user_id = ?
                """, String.class, id);
        return "Bearer " + tokens.generateAccessToken(id, id + "@example.org", List.of("ROLE_USER"), permissions);
    }

    private JsonNode json(HttpResponse<String> response) throws Exception {
        return mapper.readTree(response.body());
    }

    private HttpResponse<String> request(String method, String path, String authorization, Object body,
            String... headers) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api" + path))
                .timeout(Duration.ofSeconds(10)).header("Origin", "https://vinnot.com")
                .header("X-Vinnot-Web-Session", "1").header("Content-Type", "application/json");
        if (Objects.nonNull(authorization)) builder.header("Authorization", authorization);
        if (headers.length > 0) builder.headers(headers);
        builder.method(method, Objects.isNull(body) ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }
}
