package com.vinnot.community.infrastructure;

import java.util.Objects;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.vinnot.community.application.port.out.CommunityTargetPort.ModerationNames;
import com.vinnot.community.domain.model.ContentTarget;
import com.vinnot.community.infrastructure.persistence.JdbcCommunityTargetAdapter;
import com.vinnot.review.application.port.out.ReviewPublicationRepositoryPort.PublicationNames;
import com.vinnot.review.infrastructure.persistence.adapter.JdbcReviewPublicationAdapter;
import com.vinnot.shared.application.port.TokenService;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCreator;
import org.springframework.jdbc.core.RowCallbackHandler;
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
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.StreamSupport;
import java.util.concurrent.Executors;

/**
 * Real HTTP, security filters, use cases, migrations and PostgreSQL; no deployed accounts or paid
 * providers.
 */
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
class CommunityHttpPostgresIntegrationTest {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static final String PASSWORD = UUID.randomUUID().toString();
    private static final String SIGNING_KEY = UUID.randomUUID().toString() + UUID.randomUUID();
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @Autowired PasswordEncoder passwords;
    @Autowired TokenService tokens;
    private final HttpClient http =
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("jwt.secret", () -> SIGNING_KEY);
    }

    @AfterEach
    void clearReportFixtures() {
        jdbc.update("DELETE FROM community_reports");
    }

    @Test
    void overviewCountsAllPagesWithoutDisclosingEvidenceOrSelfModeration() throws Exception {
        Account reporter = account("USER"),
                author = account("USER"),
                moderator = account("MODERATOR"),
                other = account("USER");
        assertThat(request("GET", "/community/overview", null, null).statusCode()).isEqualTo(401);
        assertThat(
                        request("GET", "/admin/community/reports/overview", bearer(reporter), null)
                                .statusCode())
                .isEqualTo(403);
        JsonNode baseline =
                json(request("GET", "/admin/community/reports/overview", bearer(moderator), null));
        for (int index = 0; index < 26; index++) {
            String status =
                    index < 23
                            ? "OPEN"
                            : index == 23 ? "IN_REVIEW" : index == 24 ? "RESOLVED" : "DISMISSED";
            insertReport(reporter.id(), author.id(), status);
        }
        insertReport(moderator.id(), author.id(), "OPEN");
        insertReport(reporter.id(), moderator.id(), "OPEN");
        jdbc.update(
                "INSERT INTO user_blocks(blocker_id,blocked_id) VALUES (?,?)",
                reporter.id(),
                author.id());
        var overview = request("GET", "/community/overview", bearer(reporter), null);
        assertThat(overview.statusCode()).isEqualTo(200);
        JsonNode counts = json(overview).get("reports");
        assertThat(counts.get("open").asLong()).isEqualTo(24);
        assertThat(counts.get("inReview").asLong()).isEqualTo(1);
        assertThat(counts.get("resolved").asLong()).isEqualTo(1);
        assertThat(counts.get("dismissed").asLong()).isEqualTo(1);
        assertThat(json(overview).get("blockedUsers").asLong()).isEqualTo(1);
        assertThat(overview.body())
                .doesNotContain(
                        "private", reporter.id().toString(), author.id().toString(), "excerpt");
        JsonNode empty = json(request("GET", "/community/overview", bearer(other), null));
        assertThat(empty.get("reports").get("open").asLong()).isZero();
        assertThat(empty.get("blockedUsers").asLong()).isZero();
        JsonNode moderation =
                json(request("GET", "/admin/community/reports/overview", bearer(moderator), null));
        assertThat(moderation.get("open").asLong()).isEqualTo(baseline.get("open").asLong() + 23);
        for (String status : List.of("inReview", "resolved", "dismissed"))
            assertThat(moderation.get(status).asLong())
                    .isEqualTo(baseline.get(status).asLong() + 1);
        JsonNode page =
                json(request("GET", "/community/reports/mine?size=20", bearer(reporter), null));
        assertThat(page.get("totalItems").asLong()).isEqualTo(27);
        assertThat(page.get("content").size()).isEqualTo(20);
    }

    private void insertReport(UUID reporter, UUID author, String status) {
        jdbc.update(
                "INSERT INTO"
                    + " community_reports(id,reporter_id,target_type,target_id,author_id,reason,description,excerpt,status,created_at,updated_at)"
                    + " VALUES"
                    + " (?,?,'USER',?,?,'SPAM','private','private',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",
                UUID.randomUUID(),
                reporter,
                UUID.randomUUID(),
                author,
                status);
    }

    @Test
    void reportsAreContextualPrivateDeduplicatedAndAudited() throws Exception {
        Account reporter = account("USER"),
                author = account("USER"),
                moderator = account("MODERATOR"),
                other = account("USER");
        UUID wine = wine(author.id()), review = review(wine, author.id());
        var payload =
                Map.of(
                        "targetType",
                        "REVIEW",
                        "targetId",
                        review,
                        "reason",
                        "HARASSMENT",
                        "description",
                        "private evidence");
        assertThat(request("POST", "/community/reports", null, payload).statusCode())
                .isEqualTo(401);
        var created = request("POST", "/community/reports", bearer(reporter), payload);
        assertThat(created.statusCode()).isEqualTo(200);
        String id = json(created).get("id").asText();
        assertThat(created.body())
                .doesNotContain(
                        "reporterId", "authorId", "private evidence", "excerpt", "decision");
        assertThat(
                        json(request("POST", "/community/reports", bearer(reporter), payload))
                                .get("id")
                                .asText())
                .isEqualTo(id);
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM community_reports WHERE id=?",
                                Long.class,
                                UUID.fromString(id)))
                .isEqualTo(1);
        assertThat(
                        json(request("GET", "/community/reports/mine", bearer(other), null))
                                .get("content"))
                .isEmpty();
        assertThat(request("GET", "/admin/community/reports", bearer(author), null).statusCode())
                .isEqualTo(403);
        var queue = request("GET", "/admin/community/reports", bearer(moderator), null);
        assertThat(queue.body()).contains(id, "private evidence");
        var claimed =
                request(
                        "PATCH",
                        "/admin/community/reports/" + id,
                        bearer(moderator),
                        Map.of("status", "IN_REVIEW", "decision", "Investigating"));
        assertThat(claimed.statusCode()).isEqualTo(200);
        assertThat(
                        request(
                                        "PATCH",
                                        "/admin/community/reports/" + id,
                                        bearer(moderator),
                                        Map.of("status", "RESOLVED", "decision", ""))
                                .statusCode())
                .isEqualTo(422);
        assertThat(
                        request(
                                        "PATCH",
                                        "/admin/community/reports/" + id,
                                        bearer(moderator),
                                        Map.of(
                                                "status",
                                                "DISMISSED",
                                                "decision",
                                                "No violation after review"))
                                .statusCode())
                .isEqualTo(200);
        assertThat(
                        request(
                                        "PATCH",
                                        "/admin/community/reports/" + id,
                                        bearer(moderator),
                                        Map.of("status", "IN_REVIEW", "decision", "again"))
                                .statusCode())
                .isEqualTo(422);
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM community_report_actions WHERE report_id=?",
                                Long.class,
                                UUID.fromString(id)))
                .isEqualTo(3);
        assertThat(request("GET", "/community/reports/mine", bearer(reporter), null).body())
                .doesNotContain("Investigating", "No violation");
        // Removing a reporter does not erase another user's content or fabricate an acceptance.
        jdbc.update("DELETE FROM users WHERE id=?", reporter.id());
        assertThat(
                        jdbc.queryForObject(
                                "SELECT reporter_id FROM community_reports WHERE id=?",
                                UUID.class,
                                UUID.fromString(id)))
                .isNull();
    }

    @Test
    void blockHidesBothDirectionsBeforePaginationAndRejectsInteractionsButKeepsEvents()
            throws Exception {
        Account reader = account("USER"), author = account("USER"), other = account("USER");
        UUID wine = wine(author.id()),
                hiddenReview = review(wine, author.id()),
                visibleReview = review(wine, other.id());
        UUID comment = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO review_comments(publication_status,id,review_id,user_id,content)"
                        + " VALUES ('APPROVED',?,?,?,?)",
                comment,
                visibleReview,
                author.id(),
                "hidden comment");
        assertThat(
                        request("PUT", "/community/blocks/" + reader.id(), bearer(reader), null)
                                .statusCode())
                .isEqualTo(422);
        String path = "/community/blocks/" + author.id();
        assertThat(request("PUT", path, bearer(reader), null).statusCode()).isEqualTo(204);
        assertThat(request("PUT", path, bearer(reader), null).statusCode()).isEqualTo(204);
        var reviews =
                json(request("GET", "/wines/" + wine + "/reviews?size=1", bearer(reader), null));
        assertThat(reviews.get("totalItems").asInt()).isEqualTo(1);
        assertThat(reviews.get("content").get(0).get("id").asText())
                .isEqualTo(visibleReview.toString());
        assertThat(
                        json(
                                request(
                                        "GET",
                                        "/wines/"
                                                + wine
                                                + "/reviews/"
                                                + visibleReview
                                                + "/comments",
                                        bearer(reader),
                                        null)))
                .isEmpty();
        assertThat(
                        request(
                                        "POST",
                                        "/wines/" + wine + "/reviews/" + hiddenReview + "/comments",
                                        bearer(reader),
                                        Map.of("content", "blocked"))
                                .statusCode())
                .isEqualTo(404);
        assertThat(
                        request(
                                        "POST",
                                        "/wines/" + wine + "/reviews/" + hiddenReview + "/like",
                                        bearer(reader),
                                        null)
                                .statusCode())
                .isEqualTo(404);
        assertThat(
                        request("GET", "/users/" + author.id() + "/profile", bearer(reader), null)
                                .statusCode())
                .isEqualTo(404);
        assertThat(
                        request("GET", "/users/" + reader.id() + "/profile", bearer(author), null)
                                .statusCode())
                .isEqualTo(404);
        assertThat(request("GET", "/users/" + author.id() + "/profile", null, null).statusCode())
                .isEqualTo(401);
        Account unblockedReader = account("USER");
        assertThat(request("GET", "/users/" + author.id() + "/profile", bearer(unblockedReader), null).statusCode())
                .isEqualTo(200);
        UUID event = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO"
                    + " events(id,title,event_type,start_date,end_date,organizer_id,status,published_once)"
                    + " VALUES (?,'Visible event','TASTING',now()+interval '1 day',now()+interval"
                    + " '2 days',?,'PUBLISHED',true)",
                event,
                author.id());
        assertThat(request("GET", "/events/" + event, bearer(reader), null).statusCode())
                .isEqualTo(200);
        assertThat(
                        json(request("GET", "/community/blocks", bearer(reader), null))
                                .get("totalItems")
                                .asInt())
                .isEqualTo(1);
        assertThat(request("DELETE", path, bearer(reader), null).statusCode()).isEqualTo(204);
        assertThat(
                        request("GET", "/users/" + author.id() + "/profile", bearer(reader), null)
                                .statusCode())
                .isEqualTo(200);
        assertThat(
                        json(request("GET", "/wines/" + wine + "/reviews", bearer(reader), null))
                                .get("totalItems")
                                .asInt())
                .isEqualTo(2);
        // Deleting a blocked account removes the block, without touching the blocker.
        request("PUT", path, bearer(reader), null);
        jdbc.update("DELETE FROM users WHERE id=?", author.id());
        assertThat(
                        json(request("GET", "/community/blocks", bearer(reader), null))
                                .get("totalItems")
                                .asInt())
                .isZero();
    }

    @Test
    void concurrentDuplicateReportsConsumeOnlyOneSlotAndNeverAcceptPrivateTargets()
            throws Exception {
        Account reporter = account("USER"), author = account("USER");
        UUID wine = wine(author.id()), review = review(wine, author.id());
        var payload =
                Map.of(
                        "targetType",
                        "REVIEW",
                        "targetId",
                        review,
                        "reason",
                        "SPAM",
                        "description",
                        "");
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a =
                    executor.submit(
                            () -> request("POST", "/community/reports", bearer(reporter), payload));
            var b =
                    executor.submit(
                            () -> request("POST", "/community/reports", bearer(reporter), payload));
            var first = a.get();
            var second = b.get();
            assertThat(first.statusCode()).isEqualTo(200);
            assertThat(second.statusCode()).isEqualTo(200);
            assertThat(json(first).get("id")).isEqualTo(json(second).get("id"));
        }
        jdbc.update("UPDATE wines SET is_active=false WHERE id=?", wine);
        assertThat(
                        request("POST", "/community/reports", bearer(account("USER")), payload)
                                .statusCode())
                .isEqualTo(404);
        assertThat(
                        request(
                                        "POST",
                                        "/community/reports",
                                        bearer(reporter),
                                        Map.of(
                                                "targetType",
                                                "USER",
                                                "targetId",
                                                reporter.id(),
                                                "reason",
                                                "SPAM"))
                                .statusCode())
                .isEqualTo(422);
        assertThat(
                        request(
                                        "POST",
                                        "/community/reports",
                                        bearer(reporter),
                                        Map.of(
                                                "targetType",
                                                "USER",
                                                "targetId",
                                                author.id(),
                                                "reason",
                                                "OTHER",
                                                "description",
                                                " "))
                                .statusCode())
                .isEqualTo(422);
        for (int i = 0; i < 9; i++) {
            UUID id = UUID.randomUUID();
            jdbc.update(
                    "INSERT INTO"
                        + " community_reports(id,reporter_id,target_type,target_id,reason,description,excerpt,status,created_at,updated_at)"
                        + " VALUES (?,?,'REVIEW',?,'SPAM','','','RESOLVED',now(),now())",
                    id,
                    reporter.id(),
                    id);
        }
        assertThat(
                        request(
                                        "POST",
                                        "/community/reports",
                                        bearer(reporter),
                                        Map.of(
                                                "targetType",
                                                "USER",
                                                "targetId",
                                                author.id(),
                                                "reason",
                                                "SPAM"))
                                .statusCode())
                .isEqualTo(422);
    }

    @Test
    void moderatorsRemoveReportedCommentsAndReviewsAtomicallyWithoutAccountPowers()
            throws Exception {
        Account reporter = account("USER"),
                author = account("USER"),
                moderator = account("MODERATOR");
        UUID wine = wine(author.id()),
                review = review(wine, author.id()),
                comment = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO review_comments(publication_status,id,review_id,user_id,content)"
                        + " VALUES ('APPROVED',?,?,?,?)",
                comment,
                review,
                author.id(),
                "Reported comment");
        for (var target : List.of(Map.entry("COMMENT", comment), Map.entry("REVIEW", review))) {
            var created =
                    request(
                            "POST",
                            "/community/reports",
                            bearer(reporter),
                            Map.of(
                                    "targetType",
                                    target.getKey(),
                                    "targetId",
                                    target.getValue(),
                                    "reason",
                                    "HARASSMENT"));
            assertThat(created.statusCode()).isEqualTo(200);
            String id = json(created).get("id").asText();
            String endpoint = "/admin/community/reports/" + id + "/remove-content";
            assertThat(
                            request(
                                            "POST",
                                            endpoint,
                                            bearer(reporter),
                                            Map.of("status", "RESOLVED", "decision", "Remove"))
                                    .statusCode())
                    .isEqualTo(403);
            assertThat(
                            request(
                                            "POST",
                                            endpoint,
                                            bearer(moderator),
                                            Map.of("status", "RESOLVED", "decision", " "))
                                    .statusCode())
                    .isEqualTo(422);
            assertThat(
                            request(
                                            "POST",
                                            endpoint,
                                            bearer(moderator),
                                            Map.of(
                                                    "status",
                                                    "RESOLVED",
                                                    "decision",
                                                    "Removed for harassment"))
                                    .statusCode())
                    .isEqualTo(200);
            String table = target.getKey().equals("COMMENT") ? "review_comments" : "reviews";
            assertThat(
                            jdbc.queryForObject(
                                    "SELECT count(*) FROM " + table + " WHERE id=?",
                                    Long.class,
                                    target.getValue()))
                    .isZero();
            assertThat(
                            jdbc.queryForObject(
                                    "SELECT status FROM community_reports WHERE id=?",
                                    String.class,
                                    UUID.fromString(id)))
                    .isEqualTo("RESOLVED");
            assertThat(
                            jdbc.queryForObject(
                                    "SELECT count(*) FROM community_report_actions WHERE"
                                            + " report_id=?",
                                    Long.class,
                                    UUID.fromString(id)))
                    .isEqualTo(2);
        }
        var userReport =
                request(
                        "POST",
                        "/community/reports",
                        bearer(reporter),
                        Map.of("targetType", "USER", "targetId", author.id(), "reason", "SPAM"));
        assertThat(
                        request(
                                        "POST",
                                        "/admin/community/reports/"
                                                + json(userReport).get("id").asText()
                                                + "/remove-content",
                                        bearer(moderator),
                                        Map.of("status", "RESOLVED", "decision", "Remove account"))
                                .statusCode())
                .isEqualTo(422);
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM users WHERE id=?", Long.class, author.id()))
                .isEqualTo(1);
    }

    @Test
    void moderationQueuesNameAuthorsReviewersAndTargetsInOneLookupPerPage() throws Exception {
        Account reporter = account("USER"),
                author = account("USER"),
                reviewer = account("MODERATOR"),
                moderator = account("MODERATOR");
        jdbc.update("UPDATE users SET username='ana_author' WHERE id=?", author.id());
        jdbc.update("UPDATE users SET username='rev_mod' WHERE id=?", reviewer.id());
        UUID wine = wine(author.id()), review = review(wine, author.id());
        UUID comment = UUID.randomUUID(), event = UUID.randomUUID(), route = UUID.randomUUID();
        UUID missing = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO review_comments(publication_status,id,review_id,user_id,content)"
                        + " VALUES ('APPROVED',?,?,?,'Reply')",
                comment,
                review,
                author.id());
        jdbc.update(
                "INSERT INTO"
                    + " events(id,title,event_type,start_date,end_date,organizer_id,status,published_once)"
                    + " VALUES (?,'Harvest night','TASTING',now()+interval '1 day',now()+interval"
                    + " '2 days',?,'PUBLISHED',true)",
                event,
                author.id());
        jdbc.update(
                "INSERT INTO wine_routes(id,name,created_by,status) VALUES (?,'Valle route',?,"
                        + "'PUBLISHED')",
                route,
                author.id());
        Map<String, UUID> cases = new LinkedHashMap<>();
        cases.put("REVIEW", review);
        cases.put("COMMENT", comment);
        cases.put("EVENT", event);
        cases.put("WINE_ROUTE", route);
        cases.put("USER", author.id());
        Map<String, String> reportIds = new HashMap<>();
        for (var target : cases.entrySet()) {
            reportIds.put(target.getKey(), inReview(reporter.id(), target, author.id(), reviewer.id()));
        }
        String orphan =
                inReview(reporter.id(), Map.entry("REVIEW", missing), null, null);

        JsonNode page =
                json(
                        request(
                                "GET",
                                "/admin/community/reports?status=IN_REVIEW&size=50",
                                bearer(moderator),
                                null));
        Map<String, String> labels =
                Map.of(
                        "REVIEW", "Community fixture",
                        "COMMENT", "Community fixture",
                        "EVENT", "Harvest night",
                        "WINE_ROUTE", "Valle route",
                        "USER", "ana_author");
        for (var expected : labels.entrySet()) {
            JsonNode item = item(page, reportIds.get(expected.getKey()));
            assertThat(item.get("targetLabel").asText()).isEqualTo(expected.getValue());
            assertThat(item.get("authorUsername").asText()).isEqualTo("ana_author");
            assertThat(item.get("reviewerUsername").asText()).isEqualTo("rev_mod");
            // Existing fields are unchanged.
            assertThat(item.get("authorId").asText()).isEqualTo(author.id().toString());
            assertThat(item.get("reviewerId").asText()).isEqualTo(reviewer.id().toString());
            assertThat(item.get("reporterId").asText()).isEqualTo(reporter.id().toString());
            assertThat(item.get("target").get("type").asText()).isEqualTo(expected.getKey());
            assertThat(item.get("reason").asText()).isEqualTo("SPAM");
            assertThat(item.get("description").asText()).isEqualTo("private");
            assertThat(item.get("excerpt").asText()).isEqualTo("excerpt");
            assertThat(item.get("status").asText()).isEqualTo("IN_REVIEW");
            assertThat(item.has("decision") && item.has("createdAt") && item.has("updatedAt"))
                    .isTrue();
        }
        JsonNode gone = item(page, orphan);
        assertThat(gone.get("targetLabel").isNull()).isTrue();
        assertThat(gone.get("authorUsername").isNull()).isTrue();
        assertThat(gone.get("reviewerUsername").isNull()).isTrue();

        JdbcTemplate counted = spy(jdbc);
        Set<ContentTarget> targets = new HashSet<>();
        cases.forEach(
                (type, id) -> targets.add(new ContentTarget(ContentTarget.Type.valueOf(type), id)));
        targets.add(new ContentTarget(ContentTarget.Type.EVENT, missing));
        ModerationNames names =
                new JdbcCommunityTargetAdapter(counted)
                        .describe(targets, Set.of(author.id(), reviewer.id(), missing));
        verify(counted, times(1))
                .query(any(PreparedStatementCreator.class), any(RowCallbackHandler.class));
        assertThat(names.targetLabels()).hasSize(5);
        assertThat(names.targetLabels())
                .doesNotContainKey(new ContentTarget(ContentTarget.Type.EVENT, missing));
        assertThat(names.usernames())
                .containsExactlyInAnyOrderEntriesOf(
                        Map.of(author.id(), "ana_author", reviewer.id(), "rev_mod"));

        jdbc.update("UPDATE reviews SET publication_status='PENDING' WHERE id=?", review);
        JsonNode queue =
                json(request("GET", "/admin/review-publications?size=50", bearer(moderator), null));
        JsonNode pending = item(queue, review.toString());
        assertThat(pending.get("authorUsername").asText()).isEqualTo("ana_author");
        assertThat(pending.get("wineName").asText()).isEqualTo("Community fixture");
        assertThat(pending.get("authorId").asText()).isEqualTo(author.id().toString());
        assertThat(pending.get("wineId").asText()).isEqualTo(wine.toString());
        assertThat(pending.get("type").asText()).isEqualTo("REVIEW");
        assertThat(pending.has("updatedAt") && pending.has("parentApproved")).isTrue();
        JdbcTemplate countedReviews = spy(jdbc);
        PublicationNames publicationNames =
                new JdbcReviewPublicationAdapter(countedReviews)
                        .findNames(Set.of(author.id(), missing), Set.of(wine, missing));
        verify(countedReviews, times(1))
                .query(any(PreparedStatementCreator.class), any(RowCallbackHandler.class));
        assertThat(publicationNames.authors()).isEqualTo(Map.of(author.id(), "ana_author"));
        assertThat(publicationNames.wines()).isEqualTo(Map.of(wine, "Community fixture"));
        jdbc.update("UPDATE reviews SET publication_status='APPROVED' WHERE id=?", review);
    }

    private String inReview(
            UUID reporter, Map.Entry<String, UUID> target, UUID author, UUID reviewer) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO"
                    + " community_reports(id,reporter_id,target_type,target_id,author_id,reason,description,excerpt,status,reviewer_id,created_at,updated_at)"
                    + " VALUES"
                    + " (?,?,?,?,?,'SPAM','private','excerpt','IN_REVIEW',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",
                id,
                reporter,
                target.getKey(),
                target.getValue(),
                author,
                reviewer);
        return id.toString();
    }

    private static JsonNode item(JsonNode page, String id) {
        return StreamSupport.stream(page.get("content").spliterator(), false)
                .filter(node -> node.get("id").asText().equals(id))
                .findFirst()
                .orElseThrow();
    }

    @Test
    void eventAndRouteReportsRequirePublishedContentAndDeriveAuthors() throws Exception {
        Account reporter = account("USER"),
                author = account("MODERATOR"),
                moderator = account("MODERATOR");
        UUID event = UUID.randomUUID(), route = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO"
                    + " events(id,title,event_type,start_date,end_date,organizer_id,status,published_once)"
                    + " VALUES (?,'Event','TASTING',now()+interval '1 day',now()+interval '2"
                    + " days',?,'DRAFT',false)",
                event,
                author.id());
        jdbc.update(
                "INSERT INTO wine_routes(id,name,created_by,status) VALUES (?,'Route',?,'DRAFT')",
                route,
                author.id());
        for (var target : List.of(Map.entry("EVENT", event), Map.entry("WINE_ROUTE", route))) {
            var payload =
                    Map.of(
                            "targetType",
                            target.getKey(),
                            "targetId",
                            target.getValue(),
                            "reason",
                            "SPAM",
                            "authorId",
                            reporter.id());
            assertThat(
                            request("POST", "/community/reports", bearer(reporter), payload)
                                    .statusCode())
                    .isEqualTo(404);
            if (target.getKey().equals("EVENT"))
                jdbc.update(
                        "UPDATE events SET status='PUBLISHED',published_once=true WHERE id=?",
                        event);
            else jdbc.update("UPDATE wine_routes SET status='PUBLISHED' WHERE id=?", route);
            var created = request("POST", "/community/reports", bearer(reporter), payload);
            assertThat(created.statusCode()).isEqualTo(200);
            String id = json(created).get("id").asText();
            assertThat(
                            jdbc.queryForObject(
                                    "SELECT author_id FROM community_reports WHERE id=?",
                                    UUID.class,
                                    UUID.fromString(id)))
                    .isEqualTo(author.id());
            assertThat(request("GET", "/admin/community/reports", bearer(author), null).body())
                    .doesNotContain(id);
            assertThat(
                            request(
                                            "PATCH",
                                            "/admin/community/reports/" + id,
                                            bearer(author),
                                            Map.of("status", "RESOLVED", "decision", "self review"))
                                    .statusCode())
                    .isEqualTo(422);
            assertThat(request("GET", "/admin/community/reports", bearer(moderator), null).body())
                    .contains(id);
        }
    }

    @Test
    void retentionDeletesOnlyExpiredClosedCasesAndTheirEvidence() {
        var reporter = account("USER");
        UUID expired = UUID.randomUUID(), recent = UUID.randomUUID(), open = UUID.randomUUID();
        for (UUID id : List.of(expired, recent, open)) {
            String status = id.equals(open) ? "IN_REVIEW" : "RESOLVED";
            jdbc.update(
                    "INSERT INTO"
                        + " community_reports(id,reporter_id,target_type,target_id,reason,description,excerpt,status,created_at,updated_at)"
                        + " VALUES (?,?,'USER',?,'SPAM','Private"
                        + " evidence','Snapshot',?,now()-interval '120 days',now()-interval '91"
                        + " days')",
                    id,
                    reporter.id(),
                    UUID.randomUUID(),
                    status);
            jdbc.update(
                    "INSERT INTO community_report_actions(report_id,status,decision,created_at)"
                            + " VALUES (?,?,'Private decision',now()-interval '91 days')",
                    id,
                    status);
        }
        jdbc.update(
                "UPDATE community_reports SET updated_at=now()-interval '89 days' WHERE id=?",
                recent);
        UUID auditTarget = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO"
                    + " review_publication_decisions(target_type,target_id,reviewer_id,status,reason,content_revision,created_at)"
                    + " VALUES ('REVIEW',?,?,'REJECTED','Private reason',now(),now()-interval '91"
                    + " days'),('REVIEW',?,?,'APPROVED','',now(),now()-interval '89 days')",
                auditTarget,
                reporter.id(),
                auditTarget,
                reporter.id());
        var adapter =
                new com.vinnot.community.infrastructure.persistence
                        .JdbcClosedReportRetentionAdapter(jdbc);
        assertThat(
                        adapter.deleteClosedBefore(
                                Instant.now().minus(Duration.ofDays(90)), 500))
                .isEqualTo(2);
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM community_reports WHERE id=?",
                                Long.class,
                                expired))
                .isZero();
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM community_report_actions WHERE report_id=?",
                                Long.class,
                                expired))
                .isZero();
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM community_reports WHERE id IN (?,?)",
                                Long.class,
                                recent,
                                open))
                .isEqualTo(2);
        assertThat(
                        jdbc.queryForList(
                                "SELECT status FROM review_publication_decisions WHERE target_id=?",
                                String.class,
                                auditTarget))
                .containsExactly("APPROVED");
        assertThat(
                        adapter.deleteClosedBefore(
                                Instant.now().minus(Duration.ofDays(90)), 500))
                .isZero();
    }

    @Test
    void legacyPendingPublicationsStillRequireIndependentReview() throws Exception {
        Account author = account("USER"),
                reader = account("USER"),
                moderator = account("MODERATOR");
        UUID wine = wine(author.id());
        String reviewsPath = "/wines/" + wine + "/reviews";
        var created =
                request(
                        "POST",
                        reviewsPath,
                        bearer(author),
                        Map.of(
                                "rating",
                                4,
                                "title",
                                "Needs review",
                                "comment",
                                "Private pending content"));
        assertThat(created.statusCode()).isEqualTo(201);
        UUID reviewId = UUID.fromString(json(created).get("id").asText());
        assertThat(json(created).get("publicationStatus").asText()).isEqualTo("APPROVED");
        // Existing pending rows remain private; changing policy does not bulk-approve them.
        jdbc.update("UPDATE reviews SET publication_status='PENDING' WHERE id=?", reviewId);
        jdbc.update("UPDATE wines SET rating_count=0,rating_average=0 WHERE id=?", wine);
        assertThat(request("GET", reviewsPath, null, null).statusCode()).isEqualTo(401);
        assertThat(
                        json(request("GET", reviewsPath, bearer(reader), null))
                                .get("totalItems")
                                .asInt())
                .isZero();
        assertThat(
                        json(request("GET", reviewsPath, bearer(author), null))
                                .get("content")
                                .get(0)
                                .get("publicationStatus")
                                .asText())
                .isEqualTo("PENDING");
        assertThat(
                        jdbc.queryForObject(
                                "SELECT rating_count FROM wines WHERE id=?", Integer.class, wine))
                .isZero();
        assertThat(
                        request(
                                        "POST",
                                        reviewsPath + "/" + reviewId + "/like",
                                        bearer(reader),
                                        null)
                                .statusCode())
                .isEqualTo(404);
        assertThat(
                        request(
                                        "POST",
                                        "/community/reports",
                                        bearer(reader),
                                        Map.of(
                                                "targetType",
                                                "REVIEW",
                                                "targetId",
                                                reviewId,
                                                "reason",
                                                "SPAM"))
                                .statusCode())
                .isEqualTo(404);
        assertThat(request("GET", "/admin/review-publications", bearer(author), null).statusCode())
                .isEqualTo(403);
        JsonNode queue =
                json(request("GET", "/admin/review-publications", bearer(moderator), null));
        JsonNode item =
                StreamSupport.stream(queue.get("content").spliterator(), false)
                        .filter(node -> node.get("id").asText().equals(reviewId.toString()))
                        .findFirst()
                        .orElseThrow();
        String endpoint = "/admin/review-publications/REVIEW/" + reviewId;
        assertThat(
                        request(
                                        "POST",
                                        endpoint,
                                        bearer(moderator),
                                        Map.of(
                                                "status",
                                                "APPROVED",
                                                "expectedRevision",
                                                item.get("updatedAt").asText(),
                                                "reason",
                                                "Reviewed"))
                                .statusCode())
                .isEqualTo(200);
        assertThat(json(request("GET", reviewsPath, bearer(reader), null)).get("totalItems").asInt())
                .isEqualTo(1);
        assertThat(
                        jdbc.queryForObject(
                                "SELECT rating_count FROM wines WHERE id=?", Integer.class, wine))
                .isEqualTo(1);
        assertThat(
                        jdbc.queryForObject(
                                "SELECT rating_average FROM wines WHERE id=?", Double.class, wine))
                .isEqualTo(4.0);

        var comment =
                request(
                        "POST",
                        reviewsPath + "/" + reviewId + "/comments",
                        bearer(reader),
                        Map.of("content", "Comment awaiting approval"));
        assertThat(comment.statusCode()).isEqualTo(201);
        String commentId = json(comment).get("id").asText();
        // New comments are published at once; a comment left pending before that still needs a decision.
        jdbc.update("UPDATE review_comments SET publication_status='PENDING' WHERE id=?", UUID.fromString(commentId));
        String commentsPath = reviewsPath + "/" + reviewId + "/comments";
        assertThat(json(request("GET", commentsPath, bearer(author), null))).isEmpty();
        assertThat(
                        json(request("GET", commentsPath, bearer(reader), null))
                                .get(0)
                                .get("publicationStatus")
                                .asText())
                .isEqualTo("PENDING");
        String revision =
                jdbc.queryForObject(
                                "SELECT updated_at FROM review_comments WHERE id=?",
                                OffsetDateTime.class,
                                UUID.fromString(commentId))
                        .toInstant()
                        .toString();
        String commentEndpoint = "/admin/review-publications/COMMENT/" + commentId;
        assertThat(
                        request(
                                        "POST",
                                        commentEndpoint,
                                        bearer(moderator),
                                        Map.of(
                                                "status",
                                                "REJECTED",
                                                "expectedRevision",
                                                revision,
                                                "reason",
                                                " "))
                                .statusCode())
                .isEqualTo(422);
        assertThat(
                        request(
                                        "POST",
                                        commentEndpoint,
                                        bearer(moderator),
                                        Map.of("status", "APPROVED", "expectedRevision", revision))
                                .statusCode())
                .isEqualTo(200);
        assertThat(json(request("GET", commentsPath, bearer(reader), null))).hasSize(1);

        var edited =
                request(
                        "PATCH",
                        reviewsPath + "/" + reviewId,
                        bearer(author),
                        Map.of("rating", 2, "title", "Changed title", "comment", "Changed text"));
        assertThat(edited.statusCode()).isEqualTo(200);
        assertThat(json(edited).get("publicationStatus").asText()).isEqualTo("APPROVED");
        // Exercise the retained manual queue with an explicitly held legacy fixture.
        jdbc.update("UPDATE reviews SET publication_status='PENDING' WHERE id=?", reviewId);
        jdbc.update("UPDATE wines SET rating_count=0,rating_average=0 WHERE id=?", wine);
        assertThat(json(request("GET", reviewsPath, bearer(reader), null)).get("totalItems").asInt())
                .isZero();
        assertThat(json(request("GET", commentsPath, bearer(reader), null))).isEmpty();
        assertThat(
                        jdbc.queryForObject(
                                "SELECT rating_count FROM wines WHERE id=?", Integer.class, wine))
                .isZero();
        assertThat(
                        request(
                                        "POST",
                                        endpoint,
                                        bearer(moderator),
                                        Map.of(
                                                "status",
                                                "APPROVED",
                                                "expectedRevision",
                                                item.get("updatedAt").asText()))
                                .statusCode())
                .isEqualTo(422);
        // Moderators decide against the persisted revision from their queue.
        // An edit response can retain JVM nanoseconds beyond PostgreSQL precision.
        JsonNode refreshedQueue =
                json(request("GET", "/admin/review-publications", bearer(moderator), null));
        JsonNode editedItem =
                StreamSupport.stream(refreshedQueue.get("content").spliterator(), false)
                        .filter(node -> node.get("id").asText().equals(reviewId.toString()))
                        .findFirst()
                        .orElseThrow();
        assertThat(Instant.parse(editedItem.get("updatedAt").asText()))
                .isEqualTo(
                        jdbc.queryForObject(
                                        "SELECT updated_at FROM reviews WHERE id=?",
                                        OffsetDateTime.class,
                                        reviewId)
                                .toInstant());
        assertThat(
                        request(
                                        "POST",
                                        endpoint,
                                        bearer(moderator),
                                        Map.of(
                                                "status",
                                                "REJECTED",
                                                "expectedRevision",
                                                editedItem.get("updatedAt").asText(),
                                                "reasonCode",
                                                "OFFENSIVE",
                                                "reason",
                                                "Violates community rules"))
                                .statusCode())
                .isEqualTo(200);
        assertThat(jdbc.queryForObject("SELECT reason_code FROM review_publication_decisions WHERE target_id=?"
                + " AND status='REJECTED'", String.class, reviewId)).isEqualTo("OFFENSIVE");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM external_effects WHERE deduplication_key LIKE ?",
                Long.class, "notification:review-publication:REVIEW:" + reviewId + ":%")).isEqualTo(2);
        assertThat(
                        json(request("GET", reviewsPath, bearer(author), null))
                                .get("content")
                                .get(0)
                                .get("publicationStatus")
                                .asText())
                .isEqualTo("REJECTED");
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM review_publication_decisions WHERE"
                                        + " target_id=?",
                                Long.class,
                                reviewId))
                .isEqualTo(2);
    }

    @Test
    void reviewsPublishImmediatelyAndEditsKeepRatingsAndInteractionsPublic() throws Exception {
        Account author = account("USER"), reader = account("USER"), moderator = account("MODERATOR");
        UUID wine = wine(author.id());
        String path = "/wines/" + wine + "/reviews";
        var created = request("POST", path, bearer(author),
                Map.of("rating", 4, "title", "Original", "comment", "Public immediately"));
        assertThat(created.statusCode()).isEqualTo(201);
        assertThat(json(created).get("publicationStatus").asText()).isEqualTo("APPROVED");
        String id = json(created).get("id").asText();
        String itemPath = path + "/" + id;
        assertThat(json(request("GET", path, bearer(reader), null)).get("totalItems").asInt()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT rating_count FROM wines WHERE id=?", Integer.class, wine)).isEqualTo(1);
        assertThat(request("POST", itemPath + "/like", bearer(author), null).statusCode()).isEqualTo(200);
        var comment = request("POST", itemPath + "/comments", bearer(reader), Map.of("content", "Published at once"));
        assertThat(comment.statusCode()).isEqualTo(201);
        assertThat(json(comment).get("publicationStatus").asText()).isEqualTo("APPROVED");
        assertThat(json(request("GET", itemPath + "/comments", bearer(author), null)).get(0).get("content").asText())
                .isEqualTo("Published at once");
        assertThat(request("PATCH", itemPath, bearer(reader), Map.of("rating", 2)).statusCode()).isEqualTo(422);
        var edited = request("PATCH", itemPath, bearer(author),
                Map.of("rating", 2, "title", "Updated", "comment", "Still public"));
        assertThat(edited.statusCode()).isEqualTo(200);
        assertThat(json(edited).get("publicationStatus").asText()).isEqualTo("APPROVED");
        assertThat(json(request("GET", path, bearer(reader), null)).get("content").get(0).get("title").asText()).isEqualTo("Updated");
        assertThat(jdbc.queryForObject("SELECT rating_count FROM wines WHERE id=?", Integer.class, wine)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT rating_average FROM wines WHERE id=?", Double.class, wine)).isEqualTo(2.0);
        JsonNode queue = json(request("GET", "/admin/review-publications", bearer(moderator), null));
        assertThat(StreamSupport.stream(queue.get("content").spliterator(), false)
                .anyMatch(node -> node.get("id").asText().equals(id))).isFalse();
        assertThat(request("POST", "/community/reports", bearer(reader),
                Map.of("targetType", "REVIEW", "targetId", id, "reason", "SPAM")).statusCode()).isEqualTo(200);
        assertThat(request("PUT", "/community/blocks/" + author.id(), bearer(reader), null).statusCode()).isEqualTo(204);
        assertThat(json(request("GET", path, bearer(reader), null)).get("totalItems").asInt()).isZero();
        assertThat(request("POST", itemPath + "/like", bearer(reader), null).statusCode()).isEqualTo(404);
    }

    private UUID wine(UUID author) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO wines(id,name,wine_type,created_by,is_active) VALUES (?,'Community"
                        + " fixture','RED',?,true)",
                id,
                author);
        return id;
    }

    private UUID review(UUID wine, UUID author) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO reviews(publication_status,id,wine_id,user_id,rating,title,comment)"
                        + " VALUES ('APPROVED',?,?,?,4,'Fixture','Review body')",
                id,
                wine,
                author);
        return id;
    }

    private Account account(String role) {
        UUID id = UUID.randomUUID();
        var account = new Account(id, role);
        jdbc.update(
                """
                INSERT INTO users(id,username,email,password,first_name,last_name,email_verified)
                VALUES (?,?,?,?,'Acceptance','Fixture',true)
                """,
                id,
                id.toString(),
                account.email(),
                passwords.encode(PASSWORD));
        assign(id, role);
        return account;
    }

    private void assign(UUID id, String role) {
        jdbc.update(
                "INSERT INTO user_roles(user_id,role_id) SELECT ?,id FROM roles WHERE name=?",
                id,
                "ROLE_" + role);
    }

    private List<String> roles(UUID id) {
        return jdbc.queryForList(
                "SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE"
                        + " ur.user_id=? ORDER BY r.name",
                String.class,
                id);
    }

    private String bearer(Account account) {
        List<String> permissions =
                jdbc.queryForList(
                        "SELECT DISTINCT p.code FROM permissions p JOIN role_permissions rp ON"
                            + " rp.permission_id=p.id JOIN user_roles ur ON ur.role_id=rp.role_id"
                            + " WHERE ur.user_id=?",
                        String.class,
                        account.id());
        return "Bearer "
                + tokens.generateAccessToken(
                        account.id(),
                        account.email(),
                        List.of("ROLE_" + account.role()),
                        permissions);
    }

    private JsonNode json(HttpResponse<String> response) throws Exception {
        return mapper.readTree(response.body());
    }

    private HttpResponse<String> request(
            String method, String path, String authorization, Object body, String... headers)
            throws Exception {
        var builder =
                HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api" + path))
                        .timeout(Duration.ofSeconds(10))
                        .header("Origin", "https://vinnot.com")
                        .header("X-Vinnot-Web-Session", "1")
                        .header("Content-Type", "application/json");
        if (Objects.nonNull(authorization)) builder.header("Authorization", authorization);
        if (headers.length > 0) builder.headers(headers);
        builder.method(
                method,
                Objects.isNull(body)
                        ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    private record Account(UUID id, String role) {
        String email() {
            return id + "@example.org";
        }
    }
}
