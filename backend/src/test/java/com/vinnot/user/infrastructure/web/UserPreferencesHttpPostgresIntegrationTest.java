package com.vinnot.user.infrastructure.web;

import com.vinnot.shared.application.port.TokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Language and time zone preferences through real HTTP, security, Flyway and PostgreSQL. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "server.address=127.0.0.1", "ai.provider=mock", "ai.enabled=false",
        "ai.spending.paid-calls-enabled=false", "app.auth.email.provider=log",
        "app.storage.provider=local", "app.cors.allowed-origins=https://vinnot.com",
        "app.observability.snapshot.enabled=false", "app.effects.poll-ms=3600000"
})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class UserPreferencesHttpPostgresIntegrationTest {
    private static final String SIGNING_KEY = UUID.randomUUID().toString() + UUID.randomUUID();
    private static final String DEFAULT_ZONE = "America/Argentina/Buenos_Aires";

    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
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

    @Test
    void existingAccountsReadSpanishAndBuenosAiresDefaultsNextToTheirProfile() throws Exception {
        UUID member = account();

        var me = request("GET", "/auth/me", bearer(member), null);

        assertThat(me.statusCode()).isEqualTo(200);
        JsonNode body = json(me);
        assertThat(body.get("preferredLanguage").asText()).isEqualTo("es");
        assertThat(body.get("timezone").asText()).isEqualTo(DEFAULT_ZONE);
        assertThat(body.get("email").asText()).isEqualTo(member + "@example.org");
        assertThat(body.get("username").asText()).isEqualTo(member.toString());
        assertThat(body.get("onboardingCompleted").asBoolean()).isTrue();
    }

    @Test
    void storesBothPreferencesAndReturnsTheUpdatedProfile() throws Exception {
        UUID member = account();

        var updated = request("PATCH", "/users/me/preferences", bearer(member),
                Map.of("preferredLanguage", "en", "timezone", "Europe/Madrid"));

        assertThat(updated.statusCode()).isEqualTo(200);
        assertThat(json(updated).at("/data/preferredLanguage").asText()).isEqualTo("en");
        assertThat(json(updated).at("/data/timezone").asText()).isEqualTo("Europe/Madrid");
        assertThat(stored(member)).containsEntry("preferred_language", "en")
                .containsEntry("timezone", "Europe/Madrid");
        assertThat(json(request("GET", "/auth/me", bearer(member), null)).get("timezone").asText())
                .isEqualTo("Europe/Madrid");
    }

    @Test
    void omittedFieldsKeepTheirStoredValue() throws Exception {
        UUID member = account();

        assertThat(request("PATCH", "/users/me/preferences", bearer(member),
                Map.of("timezone", "America/Mexico_City")).statusCode()).isEqualTo(200);

        assertThat(stored(member)).containsEntry("preferred_language", "es")
                .containsEntry("timezone", "America/Mexico_City");
    }

    @Test
    void rejectsUnsupportedValuesWithoutChangingStoredPreferences() throws Exception {
        UUID member = account();
        String access = bearer(member);

        var language = request("PATCH", "/users/me/preferences", access, Map.of("preferredLanguage", "fr"));
        var zone = request("PATCH", "/users/me/preferences", access,
                Map.of("preferredLanguage", "en", "timezone", "+03:00"));

        assertThat(language.statusCode()).isEqualTo(400);
        assertThat(json(language).get("code").asText()).isEqualTo("INVALID_PREFERRED_LANGUAGE");
        assertThat(zone.statusCode()).isEqualTo(400);
        assertThat(json(zone).get("code").asText()).isEqualTo("INVALID_TIMEZONE");
        assertThat(stored(member)).containsEntry("preferred_language", "es")
                .containsEntry("timezone", DEFAULT_ZONE);
    }

    @Test
    void requiresAnAuthenticatedUser() throws Exception {
        var anonymous = request("PATCH", "/users/me/preferences", null, Map.of("preferredLanguage", "en"));

        assertThat(anonymous.statusCode()).isEqualTo(401);
    }

    @Test
    void profileUpdatesKeepWorkingAndPreserveStoredPreferences() throws Exception {
        UUID member = account();
        String access = bearer(member);
        request("PATCH", "/users/me/preferences", access, Map.of("preferredLanguage", "en"));

        var profile = request("PATCH", "/users/me", access, Map.of("firstName", "Ana", "lastName", "Gomez"));

        assertThat(profile.statusCode()).isEqualTo(200);
        assertThat(json(profile).at("/data/firstName").asText()).isEqualTo("Ana");
        assertThat(stored(member)).containsEntry("first_name", "Ana").containsEntry("preferred_language", "en");
    }

    @Test
    void databaseRejectsUnsupportedLanguages() {
        UUID member = account();

        assertThatThrownBy(() -> jdbc.update("UPDATE users SET preferred_language='fr' WHERE id=?", member))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private Map<String, Object> stored(UUID member) {
        return jdbc.queryForMap(
                "SELECT preferred_language, timezone, first_name FROM users WHERE id=?", member);
    }

    /** Inserts an account the way rows written before V39 look: without the new columns. */
    private UUID account() {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users(id,username,email,password,first_name,last_name,email_verified)
                VALUES (?,?,?,?,'Wine','Fixture',true)
                """, id, id.toString(), id + "@example.org", "unusable-" + UUID.randomUUID());
        jdbc.update("INSERT INTO user_roles(user_id,role_id) SELECT ?,id FROM roles WHERE name='ROLE_USER'", id);
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

    private HttpResponse<String> request(String method, String path, String authorization, Object body)
            throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api" + path))
                .timeout(Duration.ofSeconds(10)).header("Origin", "https://vinnot.com")
                .header("X-Vinnot-Web-Session", "1").header("Content-Type", "application/json");
        if (Objects.nonNull(authorization)) builder.header("Authorization", authorization);
        builder.method(method, Objects.isNull(body) ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }
}
