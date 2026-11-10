package com.vinnot.shared.infrastructure;

import java.util.Objects;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.vinnot.shared.application.port.TokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.annotation.DirtiesContext;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;

/** Real HTTP, security filters, use cases, migrations and PostgreSQL; no deployed accounts or paid providers. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "server.address=127.0.0.1", "ai.provider=mock", "ai.enabled=false",
        "ai.spending.paid-calls-enabled=false", "app.auth.email.provider=log",
        "app.storage.provider=local", "app.cors.allowed-origins=https://vinnot.com",
        "app.observability.snapshot.enabled=false", "app.effects.poll-ms=3600000",
        "app.payments.enabled=true", "app.payments.client-id=12345",
        "app.payments.client-secret=local-test-fixture",
        "app.payments.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        "app.payments.redirect-uri=https://dev.vinnot.com/partner/payments/callback"
})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class SessionAccessHttpPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final String PASSWORD = UUID.randomUUID().toString();
    private static final String SIGNING_KEY = UUID.randomUUID().toString() + UUID.randomUUID();
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @Autowired PasswordEncoder passwords;
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
    void publicPaymentCallbackRequiresValidOneUseStateButNotBrowserLogin() throws Exception {
        String callback = "/payments/mercadopago/connection/callback";
        assertThat(request("POST", callback, null, Map.of("state", "invalid", "code", "code")).statusCode()).isEqualTo(400);
        var unknown = request("POST", callback, null, Map.of("state", "s".repeat(43), "code", "code"));
        assertThat(unknown.statusCode()).isEqualTo(422);
        assertThat(unknown.body()).contains("PAYMENT_CONNECTION_EXPIRED");
        assertThat(request("GET", callback, null, null).statusCode()).isEqualTo(401);
    }

    @Test
    void paymentLinkingRequiresOrganizerSessionAndKeepsProofBoundToInitiator() throws Exception {
        String base = "/payments/mercadopago/account";
        assertThat(request("POST", base + "/connect", null, Map.of()).statusCode()).isEqualTo(401);
        for (String role : List.of("USER", "MODERATOR")) {
            assertThat(request("POST", base + "/connect", bearer(account(role)), Map.of()).statusCode()).isEqualTo(403);
        }
        Account owner = account("PARTNER");
        var connection = request("POST", base + "/connect", bearer(owner), Map.of());
        assertThat(connection.statusCode()).isEqualTo(200);
        assertThat(connection.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        String authorizationUrl = json(connection).path("authorizationUrl").asText();
        assertThat(authorizationUrl).startsWith("https://auth.mercadopago.com/authorization?").contains("code_challenge_method=S256");
        assertThat(connection.body()).doesNotContain("local-test-fixture", "accessToken", "refreshToken", "code_verifier");
        String state = Arrays.stream(URI.create(authorizationUrl).getQuery().split("&"))
                .filter(value -> value.startsWith("state=")).findFirst().orElseThrow().substring("state=".length());
        var wrongOwner = request("POST", base + "/complete", bearer(account("PARTNER")), Map.of("state", state, "code", "not-a-real-code"));
        assertThat(wrongOwner.statusCode()).isEqualTo(422);
        assertThat(wrongOwner.body()).contains("PAYMENT_CONNECTION_EXPIRED");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_connection_attempts WHERE owner_id=?", Long.class, owner.id())).isEqualTo(1);
        var status = request("GET", base, bearer(owner), null);
        assertThat(status.statusCode()).isEqualTo(200);
        assertThat(json(status).path("connected").asBoolean()).isFalse();
        assertThat(json(status).path("environment").asText()).isEqualTo("SANDBOX");
        assertThat(request("POST", base + "/complete", bearer(owner), Map.of("state", "bad", "code", "")).statusCode()).isEqualTo(400);
        assertThat(request("POST", base + "/connect", bearer(account("ADMIN")), Map.of()).statusCode()).isEqualTo(200);
    }

    @Test
    void phoneIsEditableByItsOwnerAndExcludedFromPublicProfiles() throws Exception {
        Account owner = account("USER");
        String auth = bearer(owner);
        var updated = request("PATCH", "/users/me", auth, Map.of("phoneNumber", "+54 9 11 2345-6789"));
        assertThat(updated.statusCode()).isEqualTo(200);
        assertThat(json(updated).path("data").get("phoneNumber").asText()).isEqualTo("+5491123456789");
        var unchanged = request("PATCH", "/users/me", auth, Map.of("firstName", "Guest"));
        assertThat(json(unchanged).path("data").get("phoneNumber").asText()).isEqualTo("+5491123456789");
        var me = request("GET", "/auth/me", auth, null);
        assertThat(me.statusCode()).isEqualTo(200);
        assertThat(json(me).get("phoneNumber").asText()).isEqualTo("+5491123456789");
        var publicProfile = request("GET", "/users/" + owner.id() + "/profile", bearer(account("USER")), null);
        assertThat(publicProfile.statusCode()).isEqualTo(200);
        assertThat(json(publicProfile).path("data").has("phoneNumber")).isFalse();
        assertThat(publicProfile.body()).doesNotContain("5491123456789");
        var cleared = request("PATCH", "/users/me", auth, Map.of("phoneNumber", ""));
        assertThat(cleared.statusCode()).isEqualTo(200);
        assertThat(json(cleared).path("data").path("phoneNumber").isNull() || json(cleared).path("data").path("phoneNumber").isMissingNode()).isTrue();
    }

    @Test
    void directIdsRespectRolesOwnershipAndPersistedPublicationHistory() throws Exception {
        Account owner = account("USER");
        var resources = new ArrayList<Resource>();
        for (boolean active : List.of(true, false)) {
            UUID id = UUID.randomUUID();
            jdbc.update("INSERT INTO wines(id,name,wine_type,created_by,is_active) VALUES (?,?,'RED',?,?)",
                    id, "Private fixture " + id, owner.id(), active);
            resources.add(new Resource("/wines/" + id, id, active));
        }
        for (String status : List.of("DRAFT", "PUBLISHED", "ARCHIVED")) {
            UUID id = UUID.randomUUID();
            jdbc.update("INSERT INTO wine_routes(id,name,created_by,status) VALUES (?,?,?,?)",
                    id, "Private fixture " + id, owner.id(), status);
            resources.add(new Resource("/wine-routes/" + id, id, status.equals("PUBLISHED")));
        }
        for (String status : List.of("DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED", "WITHDRAWN")) {
            UUID id = UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO events(id,title,event_type,start_date,end_date,organizer_id,status,published_once)
                    VALUES (?,?,'TASTING',now()+interval '1 day',now()+interval '2 days',?,?,?)
                    """, id, "Private fixture " + id, owner.id(),
                    status.equals("WITHDRAWN") ? "DRAFT" : status, !status.equals("DRAFT"));
            resources.add(new Resource("/events/" + id, id,
                    List.of("PUBLISHED", "CANCELLED", "COMPLETED").contains(status)));
        }
        assertResources(resources, null, false);
        for (String role : List.of("USER", "PARTNER", "MODERATOR", "ADMIN")) {
            Account other = account(role);
            assertResources(resources, bearer(other), List.of("MODERATOR", "ADMIN").contains(role));
            jdbc.update("DELETE FROM user_roles WHERE user_id=?", owner.id());
            assign(owner.id(), role);
            assertResources(resources, bearer(new Account(owner.id(), role)), true);
        }
    }

    @Test
    void recoveredPasswordAuthenticatesAdminAndAuthorizesRoleChange() throws Exception {
        Account admin = account("ADMIN");
        Account target = account("USER");
        String resetToken = UUID.randomUUID().toString();
        String resetHash = HexFormat.of().formatHex(MessageDigest
                .getInstance("SHA-256").digest(resetToken.getBytes(StandardCharsets.UTF_8)));
        String newPassword = "Recovered-" + UUID.randomUUID() + "-9";
        jdbc.update("""
                INSERT INTO user_action_tokens(id,user_id,token_type,token_hash,expires_at,created_at)
                VALUES (?,?,'PASSWORD_RESET',?,now()+interval '30 minutes',now())
                """, UUID.randomUUID(), admin.id(), resetHash);
        assertThat(request("POST", "/auth/reset-password", null,
                Map.of("token", resetToken, "newPassword", newPassword)).statusCode()).isEqualTo(200);
        var login = request("POST", "/auth/web/login", null,
                Map.of("usernameOrEmail", admin.email(), "password", newPassword));
        assertThat(login.statusCode()).isEqualTo(200);
        String access = "Bearer " + json(login).get("accessToken").asText();
        assertThat(request("POST", "/auth/reauthenticate", access,
                Map.of("password", PASSWORD)).statusCode()).isEqualTo(401);
        var confirmation = request("POST", "/auth/reauthenticate", access,
                Map.of("password", newPassword));
        assertThat(confirmation.statusCode()).isEqualTo(200);
        assertThat(request("PUT", "/admin/users/" + target.id() + "/role", access,
                Map.of("role", "ROLE_PARTNER"), "X-Admin-Reauthentication",
                json(confirmation).get("proof").asText()).statusCode()).isEqualTo(200);
        assertThat(roles(target.id())).containsExactly("ROLE_PARTNER", "ROLE_USER");
    }

    @Test
    void browserSessionRotatesAndAdminMutationRequiresProofBoundToTheCurrentSession() throws Exception {
        Account admin = account("ADMIN");
        Account otherAdmin = account("ADMIN");
        Account target = account("USER");
        var login = request("POST", "/auth/web/login", null,
                Map.of("usernameOrEmail", admin.email(), "password", PASSWORD));
        assertThat(login.statusCode()).isEqualTo(200);
        assertThat(json(login).has("refreshToken")).isFalse();
        assertThat(login.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        String cookie = login.headers().firstValue("Set-Cookie").orElseThrow();
        assertThat(cookie).startsWith("__Host-vinnot-refresh=")
                .contains("Secure", "HttpOnly", "SameSite=Strict", "Path=/").doesNotContain("Domain=");
        String access = "Bearer " + json(login).get("accessToken").asText();
        String path = "/admin/users/" + target.id() + "/role";
        var mutation = Map.of("role", "ROLE_PARTNER");
        assertThat(request("PUT", path, access, mutation).statusCode()).isEqualTo(403);
        assertThat(json(request("POST", "/auth/reauthenticate", access, Map.of("password", "wrong")))
                .get("code").asText()).isEqualTo("AUTH_FAILED");
        assertThat(roles(target.id())).containsExactly("ROLE_USER");
        var confirmation = request("POST", "/auth/reauthenticate", access, Map.of("password", PASSWORD));
        assertThat(confirmation.statusCode()).isEqualTo(200);
        String proof = json(confirmation).get("proof").asText();
        assertThat(request("PUT", path, bearer(otherAdmin), mutation, "X-Admin-Reauthentication", proof)
                .statusCode()).isEqualTo(403);
        assertThat(roles(target.id())).containsExactly("ROLE_USER");
        assertThat(request("PUT", path, access, mutation, "X-Admin-Reauthentication", proof)
                .statusCode()).isEqualTo(200);
        assertThat(roles(target.id())).containsExactly("ROLE_PARTNER", "ROLE_USER");

        var refresh = request("POST", "/auth/web/refresh", null, null, "Cookie", cookie.split(";", 2)[0]);
        assertThat(refresh.statusCode()).isEqualTo(200);
        String rotatedCookie = refresh.headers().firstValue("Set-Cookie").orElseThrow().split(";", 2)[0];
        assertThat(rotatedCookie).isNotEqualTo(cookie.split(";", 2)[0]);
        assertThat(json(refresh).has("refreshToken")).isFalse();
        var replay = request("POST", "/auth/web/refresh", null, null, "Cookie", cookie.split(";", 2)[0]);
        assertThat(replay.statusCode()).isEqualTo(422);
        assertThat(replay.headers().firstValue("Set-Cookie")).isEmpty();
        var logout = request("POST", "/auth/web/logout", null, null, "Cookie", rotatedCookie);
        assertThat(logout.statusCode()).isEqualTo(204);
        assertThat(logout.headers().firstValue("Set-Cookie").orElseThrow()).contains("Max-Age=0");
        assertThat(request("POST", "/auth/web/refresh", null, null, "Cookie", rotatedCookie)
                .statusCode()).isEqualTo(422);
    }

    @Test
    void ownEmailChangeAndPermanentDeletionRequireSessionBoundProof() throws Exception {
        Account member = account("USER");
        String access = bearer(member);
        var emailChange = Map.of("newEmail", UUID.randomUUID() + "@example.org");
        var missing = request("POST", "/users/me/email-change", access, emailChange);
        assertThat(missing.statusCode()).isEqualTo(403);
        assertThat(json(missing).get("code").asText()).isEqualTo("REAUTHENTICATION_REQUIRED");
        var denied = request("DELETE", "/users/me/permanent", access, null);
        assertThat(denied.statusCode()).isEqualTo(403);
        assertThat(json(denied).get("code").asText()).isEqualTo("REAUTHENTICATION_REQUIRED");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE id=?", Long.class, member.id())).isEqualTo(1L);

        var confirmation = request("POST", "/auth/reauthenticate", access, Map.of("password", PASSWORD));
        assertThat(confirmation.statusCode()).isEqualTo(200);
        String proof = json(confirmation).get("proof").asText();
        assertThat(request("POST", "/users/me/email-change", access, emailChange,
                "X-Admin-Reauthentication", proof).statusCode()).isEqualTo(200);
        assertThat(request("DELETE", "/users/me/permanent", access, null,
                "X-Admin-Reauthentication", proof).statusCode()).isEqualTo(204);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users WHERE id=?", Long.class, member.id())).isEqualTo(0L);
    }

    @Test
    void ownAccountDeactivationStillWorksWithoutProof() throws Exception {
        Account member = account("USER");
        assertThat(request("DELETE", "/users/me", bearer(member), null).statusCode()).isEqualTo(204);
        assertThat(jdbc.queryForObject("SELECT active FROM users WHERE id=?", Boolean.class, member.id())).isFalse();
    }

    @Test
    void anonymousBrowserBootstrapIsEmptyAndDoesNotSetOrExpireCookies() throws Exception {
        var response = request("POST", "/auth/web/refresh", null, null);
        assertThat(response.statusCode()).isEqualTo(204);
        assertThat(response.body()).isEmpty();
        assertThat(response.headers().firstValue("Set-Cookie")).isEmpty();
        assertThat(response.headers().firstValue("Cache-Control")).contains("no-store");
    }

    @Test
    void coverUploadPermissionsAndPrivateDraftVisibilityAreEnforcedOverHttp() throws Exception {
        Account owner = account("PARTNER");
        Account ordinary = account("USER");
        Account admin = account("ADMIN");
        var image = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(16, 12, BufferedImage.TYPE_INT_RGB), "png", image);
        String boundary = "vinnot-fixture-" + UUID.randomUUID();
        var multipart = new ByteArrayOutputStream();
        multipart.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"kind\"\r\n\r\nEVENT\r\n--" + boundary
                + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"photo.png\"\r\nContent-Type: image/png\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        multipart.write(image.toByteArray());
        multipart.write(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        byte[] body = multipart.toByteArray();
        assertThat(uploadCover(null, boundary, body).statusCode()).isEqualTo(403);
        assertThat(uploadCover(bearer(ordinary), boundary, body).statusCode()).isEqualTo(403);
        var uploaded = uploadCover(bearer(owner), boundary, body);
        assertThat(uploaded.statusCode()).as(uploaded.body()).isEqualTo(200);
        String path = json(uploaded).get("imageUrl").asText().substring("/api".length());
        assertThat(request("GET", path, null, null).statusCode()).isEqualTo(404);
        assertThat(request("GET", path, bearer(ordinary), null).statusCode()).isEqualTo(404);
        assertThat(request("GET", path, bearer(owner), null).statusCode()).isEqualTo(200);
        UUID event = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO events(id,title,event_type,start_date,end_date,organizer_id,status,image_url)
                VALUES (?,?,'TASTING',now()+interval '1 day',now()+interval '2 days',?,'DRAFT',?)
                """, event, "Cover fixture", owner.id(), "/api" + path);
        assertThat(request("GET", path, bearer(admin), null).statusCode()).isEqualTo(200);
        assertThat(request("GET", path, null, null).statusCode()).isEqualTo(404);
        jdbc.update("UPDATE events SET status='PUBLISHED',published_once=true WHERE id=?", event);
        var publicImage = request("GET", path, null, null);
        assertThat(publicImage.statusCode()).isEqualTo(200);
        assertThat(publicImage.headers().firstValue("Content-Type")).contains("image/webp");
        assertThat(publicImage.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        jdbc.update("UPDATE events SET status='DRAFT' WHERE id=?", event);
        assertThat(request("GET", path, null, null).statusCode()).isEqualTo(404);
    }

    private HttpResponse<String> uploadCover(String authorization, String boundary, byte[] body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/uploads/covers"))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .timeout(Duration.ofSeconds(20)).POST(HttpRequest.BodyPublishers.ofByteArray(body));
        if (Objects.nonNull(authorization)) request.header("Authorization", authorization);
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private void assertResources(List<Resource> resources, String authorization, boolean privateAccess) throws Exception {
        for (Resource resource : resources) {
            var response = request("GET", resource.path(), authorization, null);
            assertThat(response.statusCode()).as("%s, private access=%s", resource.path(), privateAccess)
                    .isEqualTo(Objects.isNull(authorization) ? 401 : resource.published() || privateAccess ? 200 : 404);
            if (response.statusCode() == 200) {
                assertThat(json(response).get("id").asText()).isEqualTo(resource.id().toString());
            } else {
                assertThat(response.body()).doesNotContain("Private fixture");
            }
        }
    }

    private Account account(String role) {
        UUID id = UUID.randomUUID();
        var account = new Account(id, role);
        jdbc.update("""
                INSERT INTO users(id,username,email,password,first_name,last_name,email_verified)
                VALUES (?,?,?,?,'Acceptance','Fixture',true)
                """, id, id.toString(), account.email(), passwords.encode(PASSWORD));
        assign(id, role);
        return account;
    }

    private void assign(UUID id, String role) {
        jdbc.update("INSERT INTO user_roles(user_id,role_id) SELECT ?,id FROM roles WHERE name=?", id, "ROLE_" + role);
    }

    private List<String> roles(UUID id) {
        return jdbc.queryForList("SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=? ORDER BY r.name",
                String.class, id);
    }

    private String bearer(Account account) {
        List<String> permissions = jdbc.queryForList("""
                SELECT DISTINCT p.code FROM permissions p JOIN role_permissions rp ON rp.permission_id = p.id
                JOIN user_roles ur ON ur.role_id = rp.role_id WHERE ur.user_id = ?
                """, String.class, account.id());
        return "Bearer " + tokens.generateAccessToken(account.id(), account.email(), List.of("ROLE_" + account.role()), permissions);
    }

    private JsonNode json(HttpResponse<String> response) throws Exception {
        return mapper.readTree(response.body());
    }

    private HttpResponse<String> request(String method, String path, String authorization, Object body, String... headers) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api" + path))
                .timeout(Duration.ofSeconds(10)).header("Origin", "https://vinnot.com")
                .header("X-Vinnot-Web-Session", "1").header("Content-Type", "application/json");
        if (Objects.nonNull(authorization)) builder.header("Authorization", authorization);
        if (headers.length > 0) builder.headers(headers);
        builder.method(method, Objects.isNull(body) ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    private record Account(UUID id, String role) {
        String email() { return id + "@example.org"; }
    }
    private record Resource(String path, UUID id, boolean published) { }
}
