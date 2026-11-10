package com.vinnot.legal.infrastructure.web;

import java.util.Objects;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Acceptance gate exercised through real HTTP, authentication, migrations and PostgreSQL. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "server.address=127.0.0.1", "ai.provider=mock", "ai.enabled=false",
        "ai.spending.paid-calls-enabled=false", "app.auth.email.provider=log",
        "app.storage.provider=local", "app.cors.allowed-origins=https://vinnot.com",
        "app.legal.enforce-acceptance=true", "app.security.rate-limit.enabled=false",
        "app.observability.snapshot.enabled=false", "app.effects.poll-ms=3600000"
})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class LegalAcceptanceHttpPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final String PASSWORD = UUID.randomUUID().toString();
    private static final String SIGNING_KEY = UUID.randomUUID().toString() + UUID.randomUUID();
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @Autowired PasswordEncoder passwords;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("jwt.secret", () -> SIGNING_KEY);
    }

    @Test
    void pendingAcceptanceDoesNotBecomeConsentOnLoginRefreshOrLanguageChange() throws Exception {
        UUID id = account();
        var login = login(id);
        String access = "Bearer " + json(login).get("accessToken").asText();
        String cookie = login.headers().firstValue("Set-Cookie").orElseThrow().split(";", 2)[0];
        assertThat(json(request("GET", "/legal/acceptance?locale=en", access, null)).get("required").asBoolean()).isTrue();
        assertThat(request("GET", "/users/me/stats", access, null).statusCode()).isEqualTo(422);
        assertThat(json(request("GET", "/users/me/stats", access, null)).get("code").asText()).isEqualTo("TERMS_ACCEPTANCE_REQUIRED");
        assertThat(request("GET", "/legal/terms/current?locale=es", access, null).statusCode()).isEqualTo(200);
        assertThat(request("GET", "/health", null, null).statusCode()).isEqualTo(200);
        var refresh = request("POST", "/auth/web/refresh", null, null, "Cookie", cookie);
        assertThat(refresh.statusCode()).isEqualTo(200);
        String renewed = "Bearer " + json(refresh).get("accessToken").asText();
        assertThat(request("GET", "/users/me/stats", renewed, null).statusCode()).isEqualTo(422);
        assertThat(count("user_legal_acceptances", "user_id", id)).isZero();

        JsonNode document = json(request("GET", "/legal/terms/current?locale=en", null, null));
        var invalid = selection(document, "0".repeat(64));
        assertThat(request("POST", "/legal/acceptance", renewed, invalid).statusCode()).isEqualTo(422);
        assertThat(count("user_legal_acceptances", "user_id", id)).isZero();
        var selection = selection(document, document.get("contentHash").asText());
        var accepted = request("POST", "/legal/acceptance", renewed, selection);
        assertThat(accepted.statusCode()).as(accepted.body()).isEqualTo(200);
        JsonNode evidence = json(accepted);
        assertThat(evidence.get("required").asBoolean()).isFalse();
        assertThat(json(request("POST", "/legal/acceptance", renewed, selection)).get("acceptedAt"))
                .isEqualTo(evidence.get("acceptedAt"));
        assertThat(json(request("GET", "/legal/acceptance?locale=es", renewed, null)).get("required").asBoolean()).isFalse();
        assertThat(count("user_legal_acceptances", "user_id", id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT locale FROM user_legal_acceptances WHERE user_id=?", String.class, id)).isEqualTo("en");
        assertThat(request("GET", "/users/me/stats", renewed, null).statusCode()).isEqualTo(200);
    }

    @Test
    void permanentDeletionRemainsAvailableWithoutConsentAndRevokesSessions() throws Exception {
        UUID id = account();
        var login = login(id);
        String access = "Bearer " + json(login).get("accessToken").asText();
        String cookie = login.headers().firstValue("Set-Cookie").orElseThrow().split(";", 2)[0];
        assertThat(count("refresh_tokens", "user_id", id)).isGreaterThan(0);
        assertThat(request("DELETE", "/users/me/permanent", access, null, "X-Admin-Reauthentication", proof(access)).statusCode()).isEqualTo(204);
        assertThat(count("users", "id", id)).isZero();
        assertThat(count("refresh_tokens", "user_id", id)).isZero();
        assertThat(request("GET", "/users/me/stats", access, null).statusCode()).isEqualTo(401);
        assertThat(request("POST", "/auth/web/refresh", null, null, "Cookie", cookie).statusCode()).isEqualTo(422);
    }

    @Test
    void deletionRemovesOwnedCommunityDataAndPreservesPrivateReportRetention() throws Exception {
        UUID owner = account(), other = account(), wine = UUID.randomUUID(), review = UUID.randomUUID();
        jdbc.update("INSERT INTO wines(id,name,wine_type,rating_count,rating_average) VALUES (?,'Deletion acceptance','RED',1,5)", wine);
        jdbc.update("INSERT INTO reviews(id,user_id,wine_id,rating,comment,publication_status) VALUES (?,?,?,5,'Discardable review','APPROVED')", review, owner, wine);
        jdbc.update("INSERT INTO user_blocks(blocker_id,blocked_id) VALUES (?,?)", owner, other);
        UUID report = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO community_reports(id,reporter_id,author_id,target_type,target_id,reason,
                  description,excerpt,status,created_at,updated_at)
                VALUES (?,?,?,'REVIEW',?,'OTHER','Private evidence','Retained evidence','OPEN',now(),now())
                """, report, other, owner, review);
        String access = "Bearer " + json(login(owner)).get("accessToken").asText();
        assertThat(request("DELETE", "/users/me/permanent", access, null, "X-Admin-Reauthentication", proof(access)).statusCode()).isEqualTo(204);
        assertThat(count("reviews", "user_id", owner)).isZero();
        assertThat(count("user_blocks", "blocker_id", owner)).isZero();
        assertThat(jdbc.queryForObject("SELECT rating_count FROM wines WHERE id=?", Integer.class, wine)).isZero();
        assertThat(jdbc.queryForObject("SELECT rating_average FROM wines WHERE id=?", Double.class, wine)).isZero();
        assertThat(jdbc.queryForObject("SELECT author_id IS NULL AND reporter_id=? AND status='OPEN' FROM community_reports WHERE id=?", Boolean.class, other, report)).isTrue();
        assertThat(jdbc.queryForObject("SELECT excerpt FROM community_reports WHERE id=?", String.class, report)).isEqualTo("Retained evidence");
    }

    private UUID account() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name,email_verified) VALUES (?,?,?,?,'Acceptance','Fixture',true)",
                id, id.toString(), id + "@example.invalid", passwords.encode(PASSWORD));
        jdbc.update("INSERT INTO user_roles(user_id,role_id) SELECT ?,id FROM roles WHERE name='ROLE_USER'", id);
        return id;
    }

    private HttpResponse<String> login(UUID id) throws Exception {
        var response = request("POST", "/auth/web/login", null,
                Map.of("usernameOrEmail", id + "@example.invalid", "password", PASSWORD));
        assertThat(response.statusCode()).isEqualTo(200);
        return response;
    }

    private Map<String, Object> selection(JsonNode document, String hash) {
        return Map.of("version", document.get("version").asText(), "locale", "en", "contentHash", hash, "accepted", true);
    }

    private String proof(String access) throws Exception {
        var confirmation = request("POST", "/auth/reauthenticate", access, Map.of("password", PASSWORD));
        assertThat(confirmation.statusCode()).isEqualTo(200);
        return json(confirmation).get("proof").asText();
    }

    private int count(String table, String column, UUID id) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE " + column + "=?", Integer.class, id);
    }

    private JsonNode json(HttpResponse<String> response) throws Exception {
        return mapper.readTree(response.body());
    }

    private HttpResponse<String> request(String method, String path, String access, Object body, String... headers) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api" + path))
                .timeout(Duration.ofSeconds(15)).header("Origin", "https://vinnot.com")
                .header("X-Vinnot-Web-Session", "1").header("Content-Type", "application/json");
        if (Objects.nonNull(access)) request.header("Authorization", access);
        if (headers.length > 0) request.headers(headers);
        request.method(method, Objects.isNull(body) ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
}
