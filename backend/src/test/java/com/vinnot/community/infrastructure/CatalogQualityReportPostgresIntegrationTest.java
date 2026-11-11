package com.vinnot.community.infrastructure;

import com.vinnot.shared.application.port.TokenService;
import com.vinnot.wine.application.port.out.CatalogQualitySignalPort;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
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

/** A corrected exact scan match through the real wine port, community use case, migrations and PostgreSQL. */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "server.address=127.0.0.1",
            "ai.provider=mock",
            "ai.enabled=false",
            "ai.spending.paid-calls-enabled=false",
            "app.auth.email.provider=log",
            "app.storage.provider=local",
            "app.cors.allowed-origins=https://vinnot.com",
            "app.security.rate-limit.enabled=false",
            "app.observability.snapshot.enabled=false",
            "app.effects.poll-ms=3600000"
        })
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class CatalogQualityReportPostgresIntegrationTest {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static final String SIGNING_KEY = UUID.randomUUID().toString() + UUID.randomUUID();
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @Autowired TokenService tokens;
    @Autowired CatalogQualitySignalPort signals;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("jwt.secret", () -> SIGNING_KEY);
    }

    @AfterEach
    void clearReports() {
        jdbc.update("DELETE FROM community_reports");
    }

    @Test
    void aCorrectionFilesOneOpenSystemReportPerPairThatModeratorsSeeAndDecide() throws Exception {
        UUID winery = winery("Bodega Norte");
        UUID matched = wine("Séptima Malbec", 2020, winery);
        UUID chosen = wine("Septima Malbec", 2020, null);
        String moderator = bearer(account("MODERATOR"), "MODERATOR");
        String catalogBefore = catalog(matched, chosen);

        signals.exactMatchCorrected(matched, chosen);
        signals.exactMatchCorrected(matched, chosen);
        signals.exactMatchCorrected(chosen, matched);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM community_reports", Long.class)).isEqualTo(1);
        JsonNode row = json(request("GET", "/admin/community/reports?status=OPEN", moderator, null))
                .get("content").get(0);
        assertThat(row.get("reporterId").isNull()).isTrue();
        assertThat(row.get("authorId").isNull()).isTrue();
        assertThat(row.get("target").get("type").asText()).isEqualTo("WINE");
        assertThat(row.get("target").get("id").asText()).isEqualTo(matched.toString());
        assertThat(row.get("relatedTargetId").asText()).isEqualTo(chosen.toString());
        assertThat(row.get("targetLabel").asText()).isEqualTo("Séptima Malbec");
        assertThat(row.get("relatedTargetLabel").asText()).isEqualTo("Septima Malbec");
        assertThat(row.get("reason").asText()).isEqualTo("CATALOG_QUALITY");
        assertThat(row.get("description").asText())
                .isEqualTo("Scan exact match corrected by a member: possible duplicate, wrong winery or wrong image");
        assertThat(row.get("excerpt").asText())
                .isEqualTo("Séptima Malbec 2020 (Bodega Norte) → Septima Malbec 2020");
        String path = "/admin/community/reports/" + row.get("id").asText();

        HttpResponse<String> removal = request("POST", path + "/remove-content", moderator,
                Map.of("status", "RESOLVED", "decision", "Remove the wine"));
        assertThat(removal.statusCode()).isEqualTo(422);
        assertThat(json(removal).get("code").asText()).isEqualTo("REPORT_REMOVAL_TARGET");

        HttpResponse<String> decided = request("PATCH", path, moderator,
                Map.of("status", "RESOLVED", "decision", "Duplicate merged by hand"));
        assertThat(decided.statusCode()).isEqualTo(200);
        assertThat(json(decided).get("status").asText()).isEqualTo("RESOLVED");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM community_report_actions a JOIN community_reports r"
                + " ON r.id=a.report_id WHERE r.reason='CATALOG_QUALITY'", Long.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM external_effects WHERE deduplication_key LIKE ?",
                Long.class, "%report-outcome:%")).isZero();

        signals.exactMatchCorrected(chosen, matched);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM community_reports WHERE status='OPEN'", Long.class))
                .isEqualTo(1);
        assertThat(catalog(matched, chosen)).isEqualTo(catalogBefore);
    }

    @Test
    void aWineThatIsGoneFilesNothing() {
        UUID matched = wine("Malbec", null, null);
        UUID retired = wine("Malbec Reserva", null, null);
        jdbc.update("UPDATE wines SET is_active=false WHERE id=?", retired);

        signals.exactMatchCorrected(matched, retired);
        signals.exactMatchCorrected(matched, UUID.randomUUID());

        assertThat(jdbc.queryForObject("SELECT count(*) FROM community_reports", Long.class)).isZero();
    }

    @Test
    void membersCannotReportWinesOrUseTheCatalogReasonButStillReportContent() throws Exception {
        UUID member = account("USER");
        UUID other = account("USER");
        UUID wine = wine("Malbec", null, null);
        String token = bearer(member, "USER");

        HttpResponse<String> wineReport = request("POST", "/community/reports", token,
                Map.of("targetType", "WINE", "targetId", wine, "reason", "SPAM"));
        HttpResponse<String> catalogReason = request("POST", "/community/reports", token,
                Map.of("targetType", "USER", "targetId", other, "reason", "CATALOG_QUALITY"));
        HttpResponse<String> userReport = request("POST", "/community/reports", token,
                Map.of("targetType", "USER", "targetId", other, "reason", "SPAM"));

        assertThat(wineReport.statusCode()).isEqualTo(422);
        assertThat(json(wineReport).get("code").asText()).isEqualTo("REPORT_NOT_ALLOWED");
        assertThat(catalogReason.statusCode()).isEqualTo(422);
        assertThat(json(catalogReason).get("code").asText()).isEqualTo("REPORT_NOT_ALLOWED");
        assertThat(userReport.statusCode()).isEqualTo(200);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM community_reports WHERE reporter_id=?", Long.class,
                member)).isEqualTo(1);
    }

    private String catalog(UUID... wines) {
        return jdbc.queryForList("SELECT id,name,winery_id,vintage,image_url,is_active,updated_at FROM wines"
                + " WHERE id = ANY(?) ORDER BY id", (Object) wines).toString();
    }

    private UUID winery(String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO wineries(id,name) VALUES (?,?)", id, name);
        return id;
    }

    private UUID wine(String name, Integer vintage, UUID winery) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO wines(id,name,vintage,winery_id,wine_type,is_active) VALUES (?,?,?,?,'RED',true)",
                id, name, vintage, winery);
        return id;
    }

    private UUID account(String role) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users(id,username,email,password,first_name,last_name,email_verified)
                VALUES (?,?,?,'unused','Catalog','Fixture',true)
                """, id, id.toString(), id + "@example.org");
        jdbc.update("INSERT INTO user_roles(user_id,role_id) SELECT ?,id FROM roles WHERE name=?", id, "ROLE_" + role);
        return id;
    }

    private String bearer(UUID account, String role) {
        List<String> permissions = jdbc.queryForList(
                "SELECT DISTINCT p.code FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id"
                        + " JOIN user_roles ur ON ur.role_id=rp.role_id WHERE ur.user_id=?",
                String.class, account);
        return "Bearer " + tokens.generateAccessToken(account, account + "@example.org", List.of("ROLE_" + role),
                permissions);
    }

    private JsonNode json(HttpResponse<String> response) {
        return mapper.readTree(response.body());
    }

    private HttpResponse<String> request(String method, String path, String authorization, Object body)
            throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api" + path))
                .timeout(Duration.ofSeconds(10))
                .header("Origin", "https://vinnot.com")
                .header("X-Vinnot-Web-Session", "1")
                .header("Content-Type", "application/json");
        if (Objects.nonNull(authorization)) {
            builder.header("Authorization", authorization);
        }
        builder.method(method, Objects.isNull(body)
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }
}
