package com.vinnot.user.infrastructure.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

/** #482 over real HTTP and PostgreSQL: five wrong passwords lock password sign-in for fifteen minutes. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "server.address=127.0.0.1", "ai.provider=mock", "ai.enabled=false",
        "ai.spending.paid-calls-enabled=false", "app.auth.email.provider=log",
        "app.storage.provider=local", "app.cors.allowed-origins=https://vinnot.com",
        "app.observability.snapshot.enabled=false", "app.effects.poll-ms=3600000",
        "app.security.rate-limit.enabled=false"
})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class LoginLockoutHttpPostgresIntegrationTest {
    private static final String SIGNING_KEY = UUID.randomUUID().toString() + UUID.randomUUID();
    private static final String PASSWORD = "Password1";

    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @Autowired PasswordEncoder encoder;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("jwt.secret", () -> SIGNING_KEY);
    }

    @Test
    void fiveWrongPasswordsLockSignInEvenForTheRightPasswordUntilTheLockEnds() throws Exception {
        UUID id = account();
        String email = id + "@example.org";
        for (int attempt = 1; attempt <= 4; attempt++) {
            var wrong = login(email, "Wrong-" + attempt);
            assertThat(wrong.statusCode()).isEqualTo(401);
            assertThat(code(wrong)).isEqualTo("AUTH_FAILED");
        }
        var fifth = login(email, "Wrong-5");
        assertThat(fifth.statusCode()).isEqualTo(423);
        assertThat(code(fifth)).isEqualTo("ACCOUNT_TEMPORARILY_LOCKED");
        assertThat(Long.parseLong(fifth.headers().firstValue("Retry-After").orElseThrow())).isBetween(890L, 900L);

        var right = login(email, PASSWORD);
        assertThat(right.statusCode()).as("the right password gets the same answer while locked").isEqualTo(423);
        assertThat(code(right)).isEqualTo("ACCOUNT_TEMPORARILY_LOCKED");
        assertThat(right.body()).doesNotContain("accessToken");

        Instant lockedUntil = jdbc.queryForObject("SELECT login_locked_until FROM users WHERE id = ?", Timestamp.class, id).toInstant();
        assertThat(lockedUntil).isBetween(Instant.now().plusSeconds(880), Instant.now().plusSeconds(901));
        assertThat(events(id, "LOGIN_FAILED")).isEqualTo(5);
        assertThat(events(id, "LOGIN_LOCKED")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT ip_address FROM security_events WHERE user_id = ? LIMIT 1", String.class, id))
                .isEqualTo("127.0.0.1");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM external_effects WHERE deduplication_key LIKE ?",
                Integer.class, "notification:login-locked:" + id + ":%")).isEqualTo(1);

        jdbc.update("UPDATE users SET login_locked_until = now() - interval '1 second' WHERE id = ?", id);
        var afterLock = login(email, PASSWORD);
        assertThat(afterLock.statusCode()).isEqualTo(200);
        assertThat(mapper.readTree(afterLock.body()).has("accessToken")).isTrue();
        assertThat(jdbc.queryForObject("SELECT login_locked_until FROM users WHERE id = ?", Timestamp.class, id)).isNull();
        assertThat(events(id, "LOGIN_SUCCEEDED")).isEqualTo(1);
    }

    @Test
    void manyParallelWrongPasswordsAreAnsweredWithoutExhaustingTheConnectionPool() throws Exception {
        List<String> emails = new ArrayList<>();
        for (int i = 0; i < 60; i++) {
            emails.add(account() + "@example.org");
        }
        Map<Integer, Integer> statuses = parallel(emails.stream().map(email -> (Attempt) () -> login(email, "Wrong-x")).toList());

        assertThat(statuses).as("a burst of wrong passwords on 60 accounts is 401 for all, never 500").isEqualTo(Map.of(401, 60));
    }

    @Test
    void aBurstOfWrongPasswordsStartsOneLockAndTheRightPasswordCannotClearIt() throws Exception {
        UUID id = account();
        String email = id + "@example.org";
        List<Attempt> wrong = new ArrayList<>();
        for (int i = 0; i < 30; i++) {
            wrong.add(() -> login(email, "Wrong-x"));
        }
        Map<Integer, Integer> statuses = parallel(wrong);

        assertThat(statuses.keySet()).as("only refusals").isSubsetOf(401, 423);
        assertThat(events(id, "LOGIN_LOCKED")).as("one lock, so one notice").isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM external_effects WHERE deduplication_key LIKE ?",
                Integer.class, "notification:login-locked:" + id + ":%")).isEqualTo(1);
        int failedBefore = events(id, "LOGIN_FAILED");
        assertThat(login(email, "Wrong-x").statusCode()).isEqualTo(423);
        assertThat(events(id, "LOGIN_FAILED")).as("a failure during the lock is refused, not counted").isEqualTo(failedBefore);
        assertThat(jdbc.queryForObject("SELECT failed_login_attempts FROM users WHERE id = ?", Integer.class, id)).isZero();
        var right = login(email, PASSWORD);
        assertThat(right.statusCode()).isEqualTo(423);
        assertThat(jdbc.queryForObject("SELECT login_locked_until FROM users WHERE id = ?", Timestamp.class, id)).isNotNull();
    }

    @Test
    void anUnknownAccountFailsLikeAWrongPasswordAndIsRecordedWithoutAUser() throws Exception {
        String unknown = UUID.randomUUID() + "@example.org";
        int before = jdbc.queryForObject(
                "SELECT COUNT(*) FROM security_events WHERE user_id IS NULL AND event_type = 'LOGIN_FAILED'", Integer.class);

        var response = login(unknown, PASSWORD);

        assertThat(response.statusCode()).isEqualTo(401);
        assertThat(code(response)).isEqualTo("AUTH_FAILED");
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM security_events WHERE user_id IS NULL AND event_type = 'LOGIN_FAILED'", Integer.class))
                .isEqualTo(before + 1);
    }

    private interface Attempt {
        HttpResponse<String> send() throws Exception;
    }

    /** Sends every attempt at once and counts the status codes. */
    private static Map<Integer, Integer> parallel(List<Attempt> attempts) {
        CountDownLatch start = new CountDownLatch(1);
        Map<Integer, Integer> statuses = new ConcurrentHashMap<>();
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            for (Attempt attempt : attempts) {
                pool.submit(() -> {
                    start.await();
                    statuses.merge(attempt.send().statusCode(), 1, Integer::sum);
                    return null;
                });
            }
            start.countDown();
        }
        return statuses;
    }

    private UUID account() {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users(id,username,email,password,first_name,last_name,email_verified)
                VALUES (?,?,?,?,'Lock','Fixture',true)
                """, id, id.toString(), id + "@example.org", encoder.encode(PASSWORD));
        jdbc.update("INSERT INTO user_roles(user_id,role_id) SELECT ?,id FROM roles WHERE name='ROLE_USER'", id);
        return id;
    }

    private int events(UUID id, String type) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM security_events WHERE user_id = ? AND event_type = ?",
                Integer.class, id, type);
    }

    private String code(HttpResponse<String> response) throws Exception {
        return mapper.readTree(response.body()).get("code").asText();
    }

    private HttpResponse<String> login(String email, String password) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/auth/login"))
                .timeout(Duration.ofSeconds(20)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(
                        Map.of("usernameOrEmail", email, "password", password))))
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString());
    }
}
