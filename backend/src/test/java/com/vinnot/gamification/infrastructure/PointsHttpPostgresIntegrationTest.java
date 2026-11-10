package com.vinnot.gamification.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.vinnot.gamification.application.command.model.AwardPointsCommand;
import com.vinnot.gamification.application.command.model.RevokePointsCommand;
import com.vinnot.gamification.application.port.in.AwardPointsUseCase;
import com.vinnot.gamification.domain.model.PointSource;
import com.vinnot.gamification.domain.model.PointSubject;
import com.vinnot.shared.application.port.TokenService;
import com.vinnot.user.application.command.model.UpdateUserProfileCommand;
import com.vinnot.user.application.port.in.UpdateUserProfileUseCase;
import com.vinnot.wine.application.query.response.WineLabelScanResponse;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import com.vinnot.wine.application.service.WineLabelScanRecorder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/** #455 points through real HTTP, security, use cases, migrations and PostgreSQL. */
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
class PointsHttpPostgresIntegrationTest {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static final String SIGNING_KEY = UUID.randomUUID().toString() + UUID.randomUUID();
    private static final String LONG_NOTE = "Red fruit up front, soft tannins and a long, slightly spicy finish that lingers.";

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @Autowired PasswordEncoder passwords;
    @Autowired TokenService tokens;
    @Autowired AwardPointsUseCase awards;
    @Autowired TransactionTemplate transactions;
    @Autowired UpdateUserProfileUseCase profiles;
    @Autowired WineLabelScanRecorder scans;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("jwt.secret", () -> SIGNING_KEY);
    }

    @Test
    void reviewsLikesAndCommentsEarnAndDeletingTheReviewTakesItsPointsBack() throws Exception {
        UUID author = account("USER");
        UUID fan = account("USER");
        UUID wine = wine("Malbec fixture");
        assertThat(request("GET", "/users/me/points", null, null).statusCode()).isEqualTo(401);

        var created = request("POST", "/wines/" + wine + "/reviews", bearer(author),
                Map.of("rating", 2.2, "comment", LONG_NOTE));
        assertThat(created.statusCode()).isEqualTo(201);
        assertThat(json(created).get("rating").decimalValue()).isEqualByComparingTo("2.2");
        String review = json(created).get("id").asString();
        JsonNode summary = points(author);
        assertThat(summary.get("points").asInt()).isEqualTo(5);
        assertThat(summary.get("tier").asString()).isEqualTo("BROTE");
        assertThat(summary.get("nextTier").asString()).isEqualTo("PARRA");
        assertThat(summary.get("nextTierAt").asInt()).isEqualTo(30);
        assertThat(summary.get("todayEarned").asInt()).isEqualTo(5);
        assertThat(summary.get("dailyCap").asInt()).isEqualTo(40);
        assertThat(summary.get("recent").get(0).get("label").asString()).isEqualTo("Malbec fixture");

        String reviewPath = "/wines/" + wine + "/reviews/" + review;
        assertThat(request("POST", reviewPath + "/like", bearer(fan), null).statusCode()).isEqualTo(200);
        assertThat(request("POST", reviewPath + "/like", bearer(author), null).statusCode()).isEqualTo(200);
        assertThat(points(author).get("points").asInt()).isEqualTo(7);
        assertThat(request("DELETE", reviewPath + "/like", bearer(fan), null).statusCode()).isEqualTo(200);
        JsonNode afterUnlike = points(author);
        assertThat(afterUnlike.get("points").asInt()).isEqualTo(6);
        assertThat(afterUnlike.get("recent").get(0).get("points").asInt()).isEqualTo(-1);

        var own = request("POST", reviewPath + "/comments", bearer(author), Map.of("content", "Thanks!"));
        var other = request("POST", reviewPath + "/comments", bearer(fan), Map.of("content", "Agreed"));
        assertThat(own.statusCode()).isEqualTo(201);
        assertThat(other.statusCode()).isEqualTo(201);
        assertThat(points(author).get("points").asInt()).isEqualTo(6);
        assertThat(points(fan).get("points").asInt()).isEqualTo(1);

        assertThat(request("DELETE", reviewPath, bearer(author), null).statusCode()).isEqualTo(200);
        assertThat(points(author).get("points").asInt()).isZero();
        assertThat(points(fan).get("points").asInt()).isEqualTo(1);

        var again = request("POST", "/wines/" + wine + "/reviews", bearer(author), Map.of("rating", 4));
        assertThat(again.statusCode()).isEqualTo(201);
        assertThat(points(author).get("points").asInt()).isEqualTo(3);
        assertThat(movementsTotal(author)).isEqualTo(3);
    }

    @Test
    void aReviewOutOfModerationHoldsNoLikePointsAndApprovalAwardsEverythingAgainOnce() throws Exception {
        UUID author = account("USER");
        UUID liker = account("USER");
        UUID moderator = account("ADMIN");
        UUID wine = wine("Moderated wine");
        var created = request("POST", "/wines/" + wine + "/reviews", bearer(author),
                Map.of("rating", 3.6, "comment", LONG_NOTE));
        assertThat(created.statusCode()).isEqualTo(201);
        String review = json(created).get("id").asString();
        String reviewPath = "/wines/" + wine + "/reviews/" + review;
        assertThat(request("POST", reviewPath + "/like", bearer(liker), null).statusCode()).isEqualTo(200);
        assertThat(points(author).get("points").asInt()).isEqualTo(6);

        // The API never sends an approved review back to the queue; a review still queued from before is in this state.
        jdbc.update("UPDATE reviews SET publication_status='PENDING' WHERE id=?::uuid", review);
        var rejected = decide(moderator, review, "REJECTED");
        assertThat(rejected.statusCode()).as(rejected.body()).isEqualTo(200);
        assertThat(points(author).get("points").asInt()).as("the rejection takes the like point back too").isZero();

        assertThat(request("POST", reviewPath + "/like", bearer(author), null).statusCode())
                .as("a review out of moderation takes no likes").isEqualTo(404);
        assertThat(points(author).get("points").asInt()).as("a rejected review earns no like").isZero();

        var edited = request("PATCH", reviewPath, bearer(author), Map.of("comment", LONG_NOTE + " Edited."));
        assertThat(edited.statusCode()).as(edited.body()).isEqualTo(200);
        assertThat(points(author).get("points").asInt()).as("a review back in the queue earns nothing").isZero();

        var approved = decide(moderator, review, "APPROVED");
        assertThat(approved.statusCode()).as(approved.body()).isEqualTo(200);
        assertThat(points(author).get("points").asInt()).as("review, note and one per current like").isEqualTo(6);
        assertThat(movementsTotal(author)).isEqualTo(6);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_point_awards WHERE user_id=? AND source='LIKE_RECEIVED'"
                + " AND active", Integer.class, author)).isEqualTo(1);
        assertThat(request("POST", reviewPath + "/like", bearer(author), null).statusCode()).isEqualTo(200);
        assertThat(points(author).get("points").asInt()).as("an approved review earns likes again").isEqualTo(7);
    }

    @Test
    void ratingsTakeOneDecimalBetweenOneTenthAndFiveAndIntegersStillWork() throws Exception {
        UUID member = account("USER");
        for (Object rating : List.of(new BigDecimal("2.15"), new BigDecimal("0.05"), new BigDecimal("5.1"), 0)) {
            var rejected = request("POST", "/wines/" + wine("Rejected " + rating) + "/reviews", bearer(member),
                    Map.of("rating", rating));
            assertThat(rejected.statusCode()).isEqualTo(400);
            assertThat(json(rejected).get("code").asString()).isEqualTo("E1001");
            assertThat(json(rejected).get("details").get(0).get("field").asString()).isEqualTo("rating");
        }
        assertThat(points(member).get("points").asInt()).isZero();
        var integer = request("POST", "/wines/" + wine("Integer") + "/reviews", bearer(member), Map.of("rating", 4));
        assertThat(integer.statusCode()).isEqualTo(201);
        assertThat(json(integer).get("rating").decimalValue()).isEqualByComparingTo("4");
        var lowest = request("POST", "/wines/" + wine("Lowest") + "/reviews", bearer(member), Map.of("rating", 0.1));
        assertThat(lowest.statusCode()).isEqualTo(201);
        var trailing = request("POST", "/wines/" + wine("Trailing") + "/reviews", bearer(member),
                Map.of("rating", new BigDecimal("3.60")));
        assertThat(trailing.statusCode()).as("trailing zeros are the same rating").isEqualTo(201);
        assertThat(json(trailing).get("rating").decimalValue()).isEqualByComparingTo("3.6");
    }

    @Test
    void aCellarEntryAddedByHandEarnsOnceAndOneAReviewCreatedEarnsNothing() throws Exception {
        UUID member = account("USER");
        UUID bottle = wine("Cellar bottle");
        var added = request("POST", "/cellar", bearer(member), Map.of("wineId", bottle, "rating", 3.6));
        assertThat(added.statusCode()).isEqualTo(201);
        assertThat(json(added).get("rating").decimalValue()).isEqualByComparingTo("3.6");
        assertThat(jdbc.queryForObject("SELECT rating_decimal FROM cellar_wines WHERE user_id=?", BigDecimal.class,
                member)).isEqualByComparingTo("3.6");
        assertThat(jdbc.queryForObject("SELECT rating FROM cellar_wines WHERE user_id=?", Integer.class, member))
                .as("the previous backend revision still reads a whole rating").isEqualTo(4);
        assertThat(points(member).get("points").asInt()).isEqualTo(1);
        String entry = json(added).get("id").asString();
        assertThat(request("DELETE", "/cellar/" + entry, bearer(member), null).statusCode()).isEqualTo(204);
        var again = request("POST", "/cellar", bearer(member), Map.of("wineId", bottle));
        assertThat(again.statusCode()).isEqualTo(201);
        assertThat(points(member).get("points").asInt()).isEqualTo(1);
        assertThat(jdbc.queryForMap("SELECT rating, rating_decimal FROM cellar_wines WHERE user_id=?", member))
                .containsEntry("rating", null).containsEntry("rating_decimal", null);
        var rerated = request("PATCH", "/cellar/" + json(again).get("id").asString(), bearer(member),
                Map.of("rating", new BigDecimal("0.40")));
        assertThat(rerated.statusCode()).as("trailing zeros are the same rating").isEqualTo(200);
        assertThat(jdbc.queryForMap("SELECT rating, rating_decimal FROM cellar_wines WHERE user_id=?", member))
                .containsEntry("rating", 1);
        assertThat(jdbc.queryForObject("SELECT rating_decimal FROM cellar_wines WHERE user_id=?", BigDecimal.class,
                member)).isEqualByComparingTo("0.4");
        var tooPrecise = request("POST", "/cellar", bearer(member), Map.of("wineId", wine("Precise"), "rating", 3.75));
        assertThat(tooPrecise.statusCode()).isEqualTo(400);

        UUID reviewed = wine("Reviewed bottle");
        assertThat(request("POST", "/wines/" + reviewed + "/reviews", bearer(member), Map.of("rating", 4.4))
                .statusCode()).isEqualTo(201);
        assertThat(jdbc.queryForObject("SELECT rating_decimal FROM cellar_wines WHERE user_id=? AND wine_id=?",
                BigDecimal.class, member, reviewed)).isEqualByComparingTo("4.4");
        assertThat(jdbc.queryForObject("SELECT rating FROM cellar_wines WHERE user_id=? AND wine_id=?",
                Integer.class, member, reviewed)).isEqualTo(4);
        assertThat(points(member).get("points").asInt()).isEqualTo(4);
    }

    @Test
    void reachingATierQueuesOnePushAndTheCelebrationIsRecorded() throws Exception {
        UUID member = account("USER");
        for (int index = 0; index < 4; index++) {
            awards.award(new AwardPointsCommand(member, PointSource.WINE_APPROVED, "submission-" + index,
                    new PointSubject(PointSubject.Kind.WINE, UUID.randomUUID())));
        }
        awards.revoke(RevokePointsCommand.of(member, PointSource.WINE_APPROVED, "submission-0"));
        awards.award(new AwardPointsCommand(member, PointSource.WINE_APPROVED, "submission-0", null));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM external_effects WHERE kind='PUSH_NOTIFICATION' AND"
                + " deduplication_key=?", Integer.class, "push:tier-reached:" + member + ":PARRA")).isEqualTo(1);

        JsonNode summary = points(member);
        assertThat(summary.get("points").asInt()).isEqualTo(32);
        assertThat(summary.get("tier").asString()).isEqualTo("PARRA");
        assertThat(summary.get("pendingCelebration").asString()).isEqualTo("PARRA");
        assertThat(summary.get("showWelcome").asBoolean()).isFalse();

        assertThat(request("POST", "/users/me/points/celebrations", bearer(member), Map.of()).statusCode())
                .isEqualTo(400);
        assertThat(request("POST", "/users/me/points/celebrations", bearer(member), Map.of("tier", "GOLD"))
                .statusCode()).isEqualTo(400);
        for (String retiredKey : List.of("PAMPANO", "ICONO_VINNOT")) {
            assertThat(request("POST", "/users/me/points/celebrations", bearer(member), Map.of("tier", retiredKey))
                    .statusCode()).isEqualTo(400);
        }
        assertThat(request("POST", "/users/me/points/celebrations", bearer(member), Map.of("tier", "PARRA"))
                .statusCode()).isEqualTo(204);
        assertThat(points(member).get("pendingCelebration").isNull()).isTrue();
    }

    @Test
    void reviewerBadgesShowTheTierAndHideItForLockedMembers() throws Exception {
        UUID shown = account("USER");
        UUID locked = account("USER");
        UUID admin = account("ADMIN");
        UUID wine = wine("Badge wine");
        for (UUID member : List.of(shown, locked)) {
            jdbc.update("INSERT INTO user_points(user_id, points, current_tier) VALUES (?, 85, 'RACIMO')", member);
            assertThat(request("POST", "/wines/" + wine + "/reviews", bearer(member), Map.of("rating", 3.3))
                    .statusCode()).isEqualTo(201);
        }
        jdbc.update("UPDATE users SET locked=true WHERE id=?", locked);

        var listed = request("GET", "/wines/" + wine + "/reviews", bearer(admin), null);
        assertThat(listed.statusCode()).as(listed.body()).isEqualTo(200);
        JsonNode reviews = json(listed).get("content");
        assertThat(reviews.size()).isEqualTo(2);
        for (JsonNode review : reviews) {
            JsonNode badge = review.get("reviewer").get("badgeTier");
            if (review.get("reviewer").get("id").asString().equals(shown.toString())) {
                assertThat(badge.asString()).isEqualTo("RACIMO");
            } else {
                assertThat(badge.isNull()).isTrue();
            }
        }
        JsonNode user = json(request("GET", "/admin/users/" + shown, bearer(admin), null));
        assertThat(user.get("points").asInt()).isEqualTo(88);
        assertThat(user.get("badgeTier").asString()).isEqualTo("RACIMO");
    }

    @Test
    void concurrentAwardsNeverPassTheDailyCapOrCountOneKeyTwice() throws Exception {
        UUID member = account("USER");
        var start = new CountDownLatch(1);
        List<Future<?>> running = new ArrayList<>();
        try (var executor = Executors.newFixedThreadPool(8)) {
            for (int index = 0; index < 20; index++) {
                String key = index < 2 ? "same-wine" : "wine-" + index;
                running.add(executor.submit(() -> {
                    start.await(5, TimeUnit.SECONDS);
                    transactions.executeWithoutResult(status -> awards.award(
                            new AwardPointsCommand(member, PointSource.REVIEW, key, null)));
                    return null;
                }));
            }
            start.countDown();
            for (Future<?> task : running) {
                task.get(30, TimeUnit.SECONDS);
            }
        }
        assertThat(points(member).get("points").asInt()).isEqualTo(40);
        assertThat(movementsTotal(member)).isEqualTo(40);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_point_awards WHERE user_id=? AND source_key='same-wine'",
                Integer.class, member)).isEqualTo(1);
    }

    @Test
    void scansAreRecordedAndAnExactMatchEarnsOncePerWine() throws Exception {
        UUID member = account("USER");
        UUID bottle = wine("Scanned bottle");
        scans.record(member, scan(WineLabelScanResponse.Outcome.EXACT_MATCH, bottle));
        scans.record(member, scan(WineLabelScanResponse.Outcome.EXACT_MATCH, bottle));
        scans.record(member, scan(WineLabelScanResponse.Outcome.NO_MATCH, null));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM wine_label_scans WHERE user_id=?", Integer.class, member))
                .isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM wine_label_scans WHERE user_id=? AND wine_id=?",
                Integer.class, member, bottle)).isEqualTo(2);
        assertThat(points(member).get("points").asInt()).isEqualTo(1);
        assertThat(points(member).get("recent").get(0).get("source").asString()).isEqualTo("SCAN_MATCH");
    }

    @Test
    void aCompleteProfileNeedsThePhoneAndEarnsOnce() throws Exception {
        UUID member = account("USER");
        profiles.execute(new UpdateUserProfileCommand(member, null, "Ana", "Lopez", null));
        assertThat(points(member).get("points").asInt()).isZero();
        jdbc.update("UPDATE users SET profile_image_url='https://cdn.example.org/a.jpg' WHERE id=?", member);
        profiles.execute(new UpdateUserProfileCommand(member, null, "Ana", "Lopez", null));
        assertThat(points(member).get("points").asInt()).as("photo and names without a phone").isZero();
        profiles.execute(new UpdateUserProfileCommand(member, null, null, null, null, "+54 9 11 2345-6789"));
        assertThat(points(member).get("points").asInt()).as("adding only the phone").isEqualTo(5);
        profiles.execute(new UpdateUserProfileCommand(member, null, "Ana Maria", "Lopez", null));
        assertThat(points(member).get("points").asInt()).isEqualTo(5);
    }

    private WineLabelScanResponse scan(WineLabelScanResponse.Outcome outcome, UUID wine) {
        WineSummaryResponse match = Objects.isNull(wine) ? null : new WineSummaryResponse(wine, "Scanned bottle", null,
                null, null, "RED", null, List.of(), null, null, null, null, 0, null, null, false, true, null, null,
                null);
        return new WineLabelScanResponse(outcome, 0.9, match, List.of(), List.of(), null);
    }

    private JsonNode points(UUID member) throws Exception {
        var response = request("GET", "/users/me/points", bearer(member), null);
        assertThat(response.statusCode()).isEqualTo(200);
        return json(response).get("data");
    }

    private HttpResponse<String> decide(UUID moderator, String review, String status) throws Exception {
        Instant revision = jdbc.queryForObject("SELECT updated_at FROM reviews WHERE id=?::uuid", Timestamp.class, review)
                .toInstant();
        Map<String, Object> body = new HashMap<>(Map.of("status", status, "expectedRevision", revision.toString()));
        if ("REJECTED".equals(status)) {
            body.put("reason", "Off topic");
        }
        return request("POST", "/admin/review-publications/REVIEW/" + review, bearer(moderator), body);
    }

    private int movementsTotal(UUID member) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(points), 0) FROM user_point_movements WHERE user_id=?",
                Integer.class, member);
    }

    private UUID wine(String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO wines(id,name,wine_type,is_active) VALUES (?,?,'RED',true)", id, name);
        return id;
    }

    private UUID account(String role) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users(id,username,email,password,first_name,last_name,email_verified)
                VALUES (?,?,?,?,'Points','Fixture',true)
                """, id, id.toString(), id + "@example.org", passwords.encode(UUID.randomUUID().toString()));
        jdbc.update("INSERT INTO user_roles(user_id,role_id) SELECT ?,id FROM roles WHERE name=?", id, "ROLE_" + role);
        return id;
    }

    private String bearer(UUID member) {
        List<String> permissions = jdbc.queryForList("""
                SELECT DISTINCT p.code FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id
                JOIN user_roles ur ON ur.role_id=rp.role_id WHERE ur.user_id=?
                """, String.class, member);
        List<String> roles = jdbc.queryForList(
                "SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=?", String.class, member);
        return "Bearer " + tokens.generateAccessToken(member, member + "@example.org", roles, permissions);
    }

    private JsonNode json(HttpResponse<String> response) {
        return mapper.readTree(response.body());
    }

    private HttpResponse<String> request(String method, String path, String authorization, Object body) throws Exception {
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
