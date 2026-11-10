package com.vinnot.sharing.infrastructure;

import java.util.Objects;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
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
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

/** Actual HTTP/security/SQL against migrated PostgreSQL, no remote accounts or services. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "server.address=127.0.0.1", "ai.provider=mock", "ai.enabled=false", "ai.spending.paid-calls-enabled=false",
        "app.auth.email.provider=log", "app.storage.provider=local", "app.observability.snapshot.enabled=false",
        "app.effects.poll-ms=3600000", "app.auth.frontend-base-url=http://localhost:8098"
})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class SharedContentHttpPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    private final HttpClient http = HttpClient.newHttpClient();
    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("jwt.secret", () -> UUID.randomUUID().toString() + UUID.randomUUID());
    }
    @Test void anonymousPreviewsRespectVisibilityAndDoNotExposePrivateAccountData() throws Exception {
        UUID owner = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name,email_verified) VALUES (?,?,?,'unused','Private','Owner',true)",
                owner, owner.toString(), owner + "@example.invalid");
        UUID wine = UUID.randomUUID();
        jdbc.update("INSERT INTO wines(id,name,wine_type,description_es,description_en,is_active) VALUES (?,'Malbec de Vinnot','RED','Descripción propia','Own description',true)", wine);
        var result = request("GET", "/share/wines/" + wine);
        assertThat(result.statusCode()).isEqualTo(200);
        assertThat(result.body()).contains("Malbec de Vinnot", "Descripción propia").doesNotContain(owner.toString(), "@example.invalid");
        assertThat(result.headers().firstValue("Cache-Control")).hasValue("no-store");
        assertThat(request("GET", "/share/wines/" + wine + "?lang=en").body()).contains("Own description");
        assertThat(request("GET", "/share/wines/" + wine + "/en").body()).contains("Own description", "Open in Vinnot");
        assertThat(request("GET", "/share/en").body()).contains("Take Vinnot with you");
        assertThat(request("HEAD", "/share/wines/" + wine).statusCode()).isEqualTo(200);
        jdbc.update("UPDATE wines SET is_active=false WHERE id=?", wine);
        assertHidden("wines", wine, "Malbec de Vinnot");
        jdbc.update("UPDATE wines SET is_active=true WHERE id=?", wine);

        UUID route = UUID.randomUUID();
        jdbc.update("INSERT INTO wine_routes(id,name,description,created_by,status) VALUES (?,'Ruta de Vinnot','Un recorrido para descubrir el mundo del vino',?,'PUBLISHED')", route, owner);
        var routeHtml = request("GET", "/share/wine-routes/" + route).body();
        assertThat(routeHtml).contains("Ruta de Vinnot", "vinnot://wine-routes/" + route);
        for (String status : new String[]{"DRAFT", "ARCHIVED"}) {
            jdbc.update("UPDATE wine_routes SET status=? WHERE id=?", status, route);
            assertHidden("wine-routes", route, "Ruta de Vinnot");
        }
        UUID event = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO events(id,title,description,event_type,start_date,end_date,organizer_id,status,published_once,contact_email)
                VALUES (?,'Degustación Vinnot','Una experiencia para compartir','TASTING',now(),now()+interval '1 hour',?,'PUBLISHED',true,'private@example.invalid')
                """, event, owner);
        var eventHtml = request("GET", "/share/events/" + event).body();
        assertThat(eventHtml).contains("Degustación Vinnot").doesNotContain("private@example.invalid");
        jdbc.update("UPDATE events SET status='CANCELLED' WHERE id=?", event);
        assertThat(request("GET", "/share/events/" + event).statusCode()).isEqualTo(200);
        jdbc.update("UPDATE events SET published_once=false WHERE id=?", event);
        assertHidden("events", event, "Degustación Vinnot");
        jdbc.update("UPDATE events SET status='DRAFT',published_once=true WHERE id=?", event);
        assertHidden("events", event, "Degustación Vinnot");
        assertHidden("events", UUID.randomUUID(), "Degustación Vinnot");
        assertThat(request("POST", "/share/wines/" + wine).statusCode()).isEqualTo(401);
        assertThat(request("GET", "/wines/" + wine).statusCode()).isEqualTo(401);

        // Optional local visual QA uses these actual server responses, never a parallel template.
        String preview = System.getProperty("vinnot.sharing.previewDir");
        if (Objects.nonNull(preview)) {
            Path directory = Files.createDirectories(Path.of(preview));
            Files.writeString(directory.resolve("wine.html"), result.body());
            Files.writeString(directory.resolve("route.html"), routeHtml);
            Files.writeString(directory.resolve("event.html"), eventHtml);
            Files.writeString(directory.resolve("app.html"), request("GET", "/share").body());
            Files.writeString(directory.resolve("missing.html"), request("GET", "/share/wines/" + UUID.randomUUID()).body());
        }
    }
    private void assertHidden(String kind, UUID id, String title) throws Exception {
        var response = request("GET", "/share/" + kind + "/" + id);
        assertThat(response.statusCode()).isEqualTo(404);
        assertThat(response.body()).doesNotContain(title).contains("Este enlace ya no está disponible");
    }
    private HttpResponse<String> request(String method, String path) throws Exception {
        return http.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api" + path))
                .method(method, HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
    }
}
