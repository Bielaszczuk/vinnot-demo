package com.vinnot.community.infrastructure;

import com.vinnot.shared.application.port.TokenService;
import com.vinnot.wine.application.port.out.TasteAffinityStore;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * #541 S7, S9, S10, S11, S12 and S15 end to end: real HTTP, security, use cases, migrations and PostgreSQL. Each test creates its
 * own members, so the tests share one database without depending on each other.
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
            "app.effects.poll-ms=3600000",
            "app.public-api-base-url=https://api.example.test/api"
        })
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class SocialHttpPostgresIntegrationTest {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static final String SIGNING_KEY = UUID.randomUUID().toString() + UUID.randomUUID();
    private static final Instant BASE = Instant.parse("2026-10-01T12:00:00Z");
    private static final String QUIZ = "/users/me/taste-quiz";
    private static final String TRAITS = "/users/me/taste-traits";
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @Autowired PasswordEncoder passwords;
    @Autowired TokenService tokens;
    @Autowired TasteAffinityStore affinities;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("jwt.secret", () -> SIGNING_KEY);
    }

    @Test
    void followIsIdempotentRejectsSelfAndHidesMissingInactiveAndBlockedMembers() throws Exception {
        UUID ana = member(true), bea = member(true), gone = member(true), blocker = member(true);
        assertThat(request("PUT", "/community/follows/" + bea, null).statusCode()).isEqualTo(401);
        var self = request("PUT", "/community/follows/" + ana, ana);
        assertThat(self.statusCode()).isEqualTo(400);
        assertThat(json(self).get("code").asString()).isEqualTo("SELF_FOLLOW");
        assertThat(request("PUT", "/community/follows/" + UUID.randomUUID(), ana).statusCode()).isEqualTo(404);
        jdbc.update("UPDATE users SET active=false WHERE id=?", gone);
        assertThat(request("PUT", "/community/follows/" + gone, ana).statusCode()).isEqualTo(404);
        jdbc.update("INSERT INTO user_blocks(blocker_id,blocked_id) VALUES (?,?)", blocker, ana);
        assertThat(request("PUT", "/community/follows/" + blocker, ana).statusCode()).isEqualTo(404);
        assertThat(request("PUT", "/community/follows/" + ana, blocker).statusCode()).isEqualTo(404);
        assertThat(follows(ana, gone) + follows(ana, blocker) + follows(blocker, ana)).isZero();

        assertThat(request("PUT", "/community/follows/" + bea, ana).statusCode()).isEqualTo(204);
        assertThat(request("PUT", "/community/follows/" + bea, ana).statusCode()).isEqualTo(204);
        assertThat(follows(ana, bea)).isEqualTo(1);
        assertThat(follows(bea, ana)).isZero();
        assertThat(request("DELETE", "/community/follows/" + bea, ana).statusCode()).isEqualTo(204);
        assertThat(request("DELETE", "/community/follows/" + bea, ana).statusCode()).isEqualTo(204);
        assertThat(follows(ana, bea)).isZero();
    }

    @Test
    void followerPointsNeedAVerifiedEmailAndAnApprovedReviewAreRevokedOnUnfollowAndPushOncePerDay() throws Exception {
        UUID star = member(true), unverified = member(false), noReview = member(true), pending = member(true),
                qualified = member(true);
        UUID wine = wine("Points Malbec", "RED", null);
        review(unverified, wine, "APPROVED", BASE);
        review(pending, wine, "PENDING", BASE);
        review(qualified, wine, "APPROVED", BASE);
        for (UUID follower : List.of(unverified, noReview, pending, qualified)) {
            assertThat(request("PUT", "/community/follows/" + star, follower).statusCode()).isEqualTo(204);
        }
        assertThat(points(star)).isEqualTo(1);
        assertThat(jdbc.queryForList("SELECT source_key FROM user_point_awards WHERE user_id=? AND"
                + " source='FOLLOWER_GAINED' AND active", String.class, star)).containsExactly(qualified.toString());
        assertThat(pushes("push:new-follower:" + qualified + ":" + star + ":%")).isEqualTo(1);
        assertThat(pushes("push:new-follower:" + unverified + ":" + star + ":%")).isEqualTo(1);

        assertThat(request("DELETE", "/community/follows/" + star, qualified).statusCode()).isEqualTo(204);
        assertThat(points(star)).isZero();
        assertThat(jdbc.queryForObject("SELECT active FROM user_point_awards WHERE user_id=? AND source='FOLLOWER_GAINED'"
                + " AND source_key=?", Boolean.class, star, qualified.toString())).isFalse();
        assertThat(request("PUT", "/community/follows/" + star, qualified).statusCode()).isEqualTo(204);
        assertThat(pushes("push:new-follower:" + qualified + ":" + star + ":%")).isEqualTo(1);
    }

    @Test
    void followersEarnAtMostTenPointsADay() throws Exception {
        UUID star = member(true);
        UUID wine = wine("Limit Malbec", "RED", null);
        for (int index = 0; index < 11; index++) {
            UUID follower = member(true);
            review(follower, wine, "APPROVED", BASE);
            assertThat(request("PUT", "/community/follows/" + star, follower).statusCode()).isEqualTo(204);
        }
        assertThat(points(star)).isEqualTo(10);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_point_awards WHERE user_id=? AND source='FOLLOWER_GAINED'",
                Integer.class, star)).isEqualTo(10);
    }

    @Test
    void blockingRemovesFollowsBothWaysAndRevokesTheirPointsWhileUnblockKeepsWorking() throws Exception {
        UUID ana = member(true), bea = member(true);
        UUID wine = wine("Block Malbec", "RED", null);
        review(ana, wine, "APPROVED", BASE);
        review(bea, wine, "APPROVED", BASE);
        request("PUT", "/community/follows/" + bea, ana);
        request("PUT", "/community/follows/" + ana, bea);
        assertThat(points(ana) + points(bea)).isEqualTo(2);
        assertThat(request("PUT", "/community/blocks/" + bea, ana).statusCode()).isEqualTo(204);
        assertThat(follows(ana, bea) + follows(bea, ana)).isZero();
        assertThat(points(ana) + points(bea)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_blocks WHERE blocker_id=? AND blocked_id=?",
                Integer.class, ana, bea)).isEqualTo(1);
        assertThat(request("DELETE", "/community/blocks/" + bea, ana).statusCode()).isEqualTo(204);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_blocks WHERE blocker_id=?", Integer.class, ana)).isZero();
        assertThat(follows(ana, bea) + follows(bea, ana)).isZero();
        assertThat(request("PUT", "/community/follows/" + bea, ana).statusCode()).isEqualTo(204);
    }

    @Test
    void followListsAreNewestFirstPagedBlockFilteredAndShowWhomTheViewerFollows() throws Exception {
        UUID star = member(true), viewer = member(true), first = member(true), second = member(true),
                blocked = member(true);
        follow(first, star, BASE);
        follow(second, star, BASE.plusSeconds(60));
        follow(blocked, star, BASE.plusSeconds(120));
        follow(viewer, first, BASE);
        follow(star, second, BASE);
        jdbc.update("INSERT INTO user_blocks(blocker_id,blocked_id) VALUES (?,?)", blocked, viewer);

        JsonNode followers = json(request("GET", "/community/users/" + star + "/followers?page=0&size=10", viewer));
        assertThat(ids(followers)).containsExactly(second.toString(), first.toString());
        assertThat(followers.get("totalItems").asLong()).isEqualTo(2);
        JsonNode firstRow = followers.get("content").get(1);
        assertThat(firstRow.get("following").asBoolean()).isTrue();
        assertThat(firstRow.get("username").asString()).isEqualTo(first.toString());
        assertThat(firstRow.get("displayName").asString()).isEqualTo("Fixture Member");
        assertThat(firstRow.get("tier").asString()).isEqualTo("BROTE");
        assertThat(firstRow.has("avatarUrl")).isTrue();
        assertThat(followers.get("content").get(0).get("following").asBoolean()).isFalse();
        JsonNode paged = json(request("GET", "/community/users/" + star + "/followers?page=1&size=1", viewer));
        assertThat(ids(paged)).containsExactly(first.toString());

        assertThat(ids(json(request("GET", "/community/users/" + star + "/following", viewer))))
                .containsExactly(second.toString());
        assertThat(request("GET", "/community/users/" + star + "/following?size=51", viewer).statusCode()).isEqualTo(422);
        assertThat(request("GET", "/community/users/" + blocked + "/followers", viewer).statusCode()).isEqualTo(404);
        assertThat(request("GET", "/community/users/" + UUID.randomUUID() + "/following", viewer).statusCode())
                .isEqualTo(404);
    }

    @Test
    void suggestionsRankByAffinityThenReviewsAndSkipSelfFollowedBlockedAndUnratedMembers() throws Exception {
        UUID viewer = member(true), twin = member(true), opposite = member(true), followed = member(true),
                blocked = member(true), newcomer = member(true), inactive = member(true), busy = member(true);
        taste(viewer, "TYPE", "RED", "4.00", 5);
        taste(twin, "TYPE", "RED", "4.00", 6);
        taste(opposite, "TYPE", "WHITE", "5.00", 5);
        taste(busy, "TYPE", "WHITE", "4.00", 5);
        taste(followed, "TYPE", "RED", "4.00", 5);
        taste(blocked, "TYPE", "RED", "4.00", 5);
        taste(inactive, "TYPE", "RED", "4.00", 5);
        taste(newcomer, "TYPE", "RED", "4.00", 4);
        UUID wine = wine("Suggest Malbec", "RED", null);
        review(busy, wine, "APPROVED", BASE);
        follow(viewer, followed, BASE);
        jdbc.update("INSERT INTO user_blocks(blocker_id,blocked_id) VALUES (?,?)", viewer, blocked);
        jdbc.update("UPDATE users SET active=false WHERE id=?", inactive);

        var response = request("GET", "/community/suggestions?size=20", viewer);
        assertThat(response.statusCode()).isEqualTo(200);
        List<JsonNode> rows = StreamSupport.stream(json(response).spliterator(), false).toList();
        List<String> ids = rows.stream().map(row -> row.get("id").asString()).toList();
        assertThat(ids).doesNotContain(viewer.toString(), followed.toString(), blocked.toString(), newcomer.toString(),
                inactive.toString());
        assertThat(ids.indexOf(twin.toString())).isLessThan(ids.indexOf(busy.toString()));
        assertThat(ids.indexOf(busy.toString())).isLessThan(ids.indexOf(opposite.toString()));
        JsonNode twinRow = rows.get(ids.indexOf(twin.toString()));
        assertThat(twinRow.get("affinityPercent").asInt()).isEqualTo(100);
        assertThat(twinRow.get("reviewsCount").asLong()).isZero();
        assertThat(twinRow.get("tier").asString()).isEqualTo("BROTE");
        assertThat(rows.get(ids.indexOf(busy.toString())).get("reviewsCount").asLong()).isEqualTo(1);
        assertThat(rows.get(ids.indexOf(opposite.toString())).get("affinityPercent").asInt()).isZero();
        assertThat(request("GET", "/community/suggestions?size=21", viewer).statusCode()).isEqualTo(422);
        assertThat(json(request("GET", "/community/suggestions?size=1", viewer)).size()).isEqualTo(1);
    }

    @Test
    void theFeedShowsApprovedReviewsOfFollowedMembersNewestFirstWithoutBlockedOrUnfollowedOnes() throws Exception {
        UUID viewer = member(true), friend = member(true), other = member(true), stranger = member(true);
        UUID winery = winery("Bodega Feed");
        UUID older = wine("Feed Older", "RED", winery), newer = wine("Feed Newer", "WHITE", winery),
                hidden = wine("Feed Pending", "RED", winery);
        UUID oldReview = review(friend, older, "APPROVED", BASE);
        UUID newReview = review(other, newer, "APPROVED", BASE.plusSeconds(3600));
        review(friend, hidden, "PENDING", BASE.plusSeconds(7200));
        review(stranger, newer, "APPROVED", BASE.plusSeconds(9000));
        follow(viewer, friend, BASE);
        follow(viewer, other, BASE);

        JsonNode feed = json(request("GET", "/community/feed?page=0&size=10", viewer));
        assertThat(StreamSupport.stream(feed.get("content").spliterator(), false)
                .map(row -> row.get("reviewId").asString()).toList())
                .containsExactly(newReview.toString(), oldReview.toString());
        JsonNode top = feed.get("content").get(0);
        assertThat(top.get("rating").decimalValue()).isEqualByComparingTo("4");
        assertThat(top.get("title").asString()).isEqualTo("Fixture");
        assertThat(top.get("comment").asString()).isEqualTo("Review body");
        assertThat(top.has("vintage")).isTrue();
        assertThat(top.has("createdAt")).isTrue();
        assertThat(top.get("reviewer").get("id").asString()).isEqualTo(other.toString());
        assertThat(top.get("reviewer").get("displayName").asString()).isEqualTo("Fixture Member");
        assertThat(top.get("reviewer").get("tier").asString()).isEqualTo("BROTE");
        assertThat(top.get("wine").get("id").asString()).isEqualTo(newer.toString());
        assertThat(top.get("wine").get("name").asString()).isEqualTo("Feed Newer");
        assertThat(top.get("wine").get("type").asString()).isEqualTo("WHITE");
        assertThat(top.get("wine").get("wineryName").asString()).isEqualTo("Bodega Feed");
        assertThat(top.get("wine").has("imageUrl")).isTrue();

        jdbc.update("INSERT INTO user_blocks(blocker_id,blocked_id) VALUES (?,?)", other, viewer);
        assertThat(json(request("GET", "/community/feed", viewer)).get("totalItems").asLong()).isEqualTo(1);
    }

    @Test
    void theProfileAddsSocialFieldsKeepsTheExistingOnesAndHidesBlockedInactiveAndMissingMembers() throws Exception {
        UUID ana = member(true), bea = member(true), blocked = member(true), gone = member(true);
        jdbc.update("UPDATE users SET bio='Malbec lover' WHERE id=?", bea);
        UUID wine = wine("Profile Malbec", "RED", null), pendingWine = wine("Profile Pending", "RED", null);
        review(bea, wine, "APPROVED", BASE);
        review(bea, pendingWine, "PENDING", BASE);
        cellar(bea, wine, "private note", "99.90");
        follow(ana, bea, BASE);
        follow(bea, ana, BASE);
        tasteProfile(ana, 5);
        for (int index = 1; index <= 7; index++) {
            taste(bea, "GRAPE", "grape-" + index, "4.00", index);
        }
        taste(bea, "TYPE", "RED", "4.00", 4);
        taste(bea, "TYPE", "WHITE", "3.00", 2);

        JsonNode profile = json(request("GET", "/users/" + bea + "/profile", ana)).get("data");
        assertThat(profile.get("id").asString()).isEqualTo(bea.toString());
        assertThat(profile.get("username").asString()).isEqualTo(bea.toString());
        assertThat(profile.get("fullName").asString()).isEqualTo("Fixture Member");
        assertThat(profile.has("avatarUrl")).isTrue();
        assertThat(profile.get("roles").toString()).contains("ROLE_USER");
        assertThat(profile.has("createdAt")).isTrue();
        assertThat(profile.get("bio").asString()).isEqualTo("Malbec lover");
        assertThat(profile.get("tier").asString()).isEqualTo("BROTE");
        assertThat(profile.get("followersCount").asLong()).isEqualTo(1);
        assertThat(profile.get("followingCount").asLong()).isEqualTo(1);
        assertThat(profile.get("reviewsCount").asLong()).isEqualTo(1);
        assertThat(profile.get("cellarCount").asLong()).isEqualTo(1);
        assertThat(profile.get("cellarVisible").asBoolean()).isTrue();
        assertThat(profile.get("following").asBoolean()).isTrue();
        assertThat(profile.get("followsYou").asBoolean()).isTrue();
        assertThat(profile.get("affinityPercent").isInt()).isTrue();
        // The gate reads the taste table (six rated wines); the slices come from Bea's own ratings: the approved and
        // the pending review of two red wines without grapes or region.
        JsonNode wheel = profile.get("tasteWheel");
        assertThat(wheel.size()).isEqualTo(1);
        assertSlice(wheel.get(0), "TYPE", "RED", "RED", "4.00", "RED", 2);
        assertThat(wheel.toString()).doesNotContain("grape-");
        assertThat(profile.toString()).doesNotContain("email", "phoneNumber", "cellarVisibility", "private note");

        assertThat(profile.get("tasteTraits").get("structure").isEmpty()).isTrue();
        assertThat(profile.get("tasteTraits").get("families").isEmpty()).isTrue();
        assertThat(profile.get("tasteTraits").get("fromQuiz").asBoolean()).isFalse();

        JsonNode own = json(request("GET", "/users/" + ana + "/profile", ana)).get("data");
        assertThat(own.get("affinityPercent").isNull()).isTrue();
        assertThat(own.get("tasteWheel").isArray()).isTrue();
        assertThat(own.get("tasteWheel").isEmpty()).isTrue();
        assertThat(own.get("following").asBoolean()).isFalse();
        JsonNode unrated = json(request("GET", "/users/" + blocked + "/profile", ana)).get("data");
        assertThat(unrated.get("tasteWheel").isNull()).isTrue();
        assertThat(unrated.get("tasteTraits").isNull()).isTrue();
        assertThat(unrated.get("affinityPercent").isNull()).isTrue();
        assertThat(unrated.get("bio").isNull()).isTrue();
        assertThat(unrated.get("reviewsCount").asLong()).isZero();

        jdbc.update("INSERT INTO user_blocks(blocker_id,blocked_id) VALUES (?,?)", blocked, ana);
        assertThat(request("GET", "/users/" + blocked + "/profile", ana).statusCode()).isEqualTo(404);
        jdbc.update("UPDATE users SET active=false WHERE id=?", gone);
        assertThat(request("GET", "/users/" + gone + "/profile", ana).statusCode()).isEqualTo(404);
        assertThat(request("GET", "/users/" + UUID.randomUUID() + "/profile", ana).statusCode()).isEqualTo(404);
    }

    @Test
    void theWheelUnifiesGreekAndLatinGrapesAddsRegionsToneAndRatedWinesAndLeavesTheTasteTableAsItWas()
            throws Exception {
        UUID viewer = member(true), greek = member(true);
        jdbc.update("UPDATE users SET cellar_visibility='PRIVATE' WHERE id=?", greek);
        String regionName = "Nemea " + greek.toString().substring(0, 8);
        UUID nemea = region(regionName);
        UUID first = wine("Wheel Ktima One", "RED", "[\"Agiorgitiko\"]", nemea);
        UUID second = wine("Wheel Ktima Two", "RED", "[\"ΑΓΙΩΡΓΙΤΙΚΟ\"]", nemea);
        UUID third = wine("Wheel Ktima Three", "RED", "[\"Αγιωργίτικο\", \" \"]", null);
        UUID fourth = wine("Wheel Ktima Four", "WHITE", "[\"Assyrtiko\"]", null);
        UUID fifth = wine("Wheel Ktima Five", "WHITE", "[\"ασύρτικο\"]", null);
        rated(greek, first, "APPROVED", "5", BASE);
        rated(greek, second, "PENDING", "4", BASE);
        rated(greek, third, "REJECTED", "1", BASE);
        ratedInCellar(greek, third, "4");
        rated(greek, fourth, "APPROVED", "4.5", BASE);
        ratedInCellar(greek, fifth, "3.5");
        for (UUID wine : List.of(first, second, third, fourth, fifth)) {
            rated(viewer, wine, "APPROVED", "4", BASE);
        }
        affinities.recompute(BASE);

        // Every consumer of the taste table keeps seeing types and grapes as written (one row per spelling), no regions.
        assertThat(jdbc.queryForList("SELECT value FROM user_taste_affinities WHERE user_id=? AND kind='TYPE'",
                String.class, greek)).containsExactlyInAnyOrder("RED", "WHITE");
        assertThat(jdbc.queryForList("SELECT value FROM user_taste_affinities WHERE user_id=? AND kind='GRAPE'",
                String.class, greek)).hasSize(5).contains("agiorgitiko", "assyrtiko");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_taste_affinities WHERE user_id=?", Integer.class,
                greek)).isEqualTo(7);
        int expectedAffinity = tableAffinity(viewer, greek);

        JsonNode profile = json(request("GET", "/users/" + greek + "/profile", viewer)).get("data");
        JsonNode wheel = profile.get("tasteWheel");
        assertThat(wheel.size()).isEqualTo(5);
        assertSlice(wheel.get(0), "GRAPE", "agiorgitiko", "Agiorgitiko", "4.33", "RED", 3);
        assertSlice(wheel.get(1), "GRAPE", "assyrtiko", "Assyrtiko", "4.00", "WHITE", 2);
        assertSlice(wheel.get(2), "TYPE", "RED", "RED", "4.33", "RED", 3);
        assertSlice(wheel.get(3), "TYPE", "WHITE", "WHITE", "4.00", "WHITE", 2);
        assertSlice(wheel.get(4), "REGION", nemea.toString(), regionName, "4.50", null, 2);
        assertThat(profile.get("cellarVisible").asBoolean()).isFalse();
        assertThat(profile.get("cellarCount").isNull()).isTrue();
        assertThat(profile.toString()).doesNotContain("Wheel Ktima", first.toString(), fifth.toString());
        assertThat(profile.get("affinityPercent").asInt()).isEqualTo(expectedAffinity);

        List<JsonNode> suggestions = StreamSupport.stream(
                json(request("GET", "/community/suggestions?size=20", viewer)).spliterator(), false).toList();
        JsonNode suggested = suggestions.stream().filter(row -> row.get("id").asString().equals(greek.toString()))
                .findFirst().orElseThrow();
        assertThat(suggested.get("affinityPercent").asInt()).isEqualTo(expectedAffinity);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_taste_affinities WHERE kind NOT IN ('TYPE','GRAPE')",
                Integer.class)).isZero();
    }

    /** The cosine of both members' taste table rows, rounded like the profile and the suggestions round it. */
    private int tableAffinity(UUID viewer, UUID member) {
        Map<String, Object> row = jdbc.queryForMap("""
                SELECT COALESCE(sum(a.score::float8 * b.score::float8), 0) AS dot,
                       (SELECT sqrt(sum(score::float8 * score::float8)) FROM user_taste_affinities WHERE user_id=?) AS na,
                       (SELECT sqrt(sum(score::float8 * score::float8)) FROM user_taste_affinities WHERE user_id=?) AS nb
                FROM user_taste_affinities a JOIN user_taste_affinities b ON b.kind=a.kind AND b.value=a.value
                WHERE a.user_id=? AND b.user_id=?
                """, viewer, member, viewer, member);
        double cosine = ((Number) row.get("dot")).doubleValue()
                / (((Number) row.get("na")).doubleValue() * ((Number) row.get("nb")).doubleValue());
        return (int) Math.round(Math.min(1d, cosine) * 100);
    }

    private static void assertSlice(JsonNode slice, String kind, String value, String label, String score, String tone,
            int ratedWines) {
        assertThat(slice.get("kind").asString()).isEqualTo(kind);
        assertThat(slice.get("value").asString()).isEqualTo(value);
        assertThat(slice.get("label").asString()).isEqualTo(label);
        assertThat(slice.get("score").decimalValue()).isEqualByComparingTo(new BigDecimal(score));
        if (Objects.isNull(tone)) {
            assertThat(slice.get("tone").isNull()).isTrue();
        } else {
            assertThat(slice.get("tone").asString()).isEqualTo(tone);
        }
        assertThat(slice.get("ratedWines").asInt()).isEqualTo(ratedWines);
    }

    @Test
    void tasteTraitsWeighTheLikedWinesStructureAndAromaFamiliesFromTheCatalogAndTheAiProfiles() throws Exception {
        UUID viewer = member(true), taster = member(true), newcomer = member(true);
        tasteProfile(taster, 5);
        UUID catalogAcid = wine("Traits Catalog", "RED", null);
        jdbc.update("UPDATE wines SET acidity_score=80 WHERE id=?", catalogAcid);
        aiProfile(catalogAcid, "es", "{\"acidityScore\": 20, \"bodyScore\": 60}", "[\"Cereza negra\", \"Vainilla\"]",
                "[]", "[]", "[]");
        UUID pendingReview = wine("Traits Pending", "RED", null);
        aiProfile(pendingReview, "en", "{\"acidityScore\": 50}", "[]", "[\"Black pepper\"]", "[\"Violet\"]", "[]");
        UUID cellarRated = wine("Traits Cellar", "RED", null);
        aiProfile(cellarRated, "es", "{\"acidityScore\": 60}", "[]", "[]", "[]", "[\"Mora\", \"Miel\"]");
        UUID rejected = wine("Traits Rejected", "RED", null);
        aiProfile(rejected, "es", "{\"acidityScore\": 0}", "[\"Tiza\"]", "[]", "[]", "[]");
        UUID disliked = wine("Traits Disliked", "RED", null);
        aiProfile(disliked, "es", "{\"acidityScore\": 100}", "[\"Tiza\"]", "[]", "[]", "[]");
        UUID unprofiled = wine("Traits Unprofiled", "RED", null);
        jdbc.update("UPDATE wines SET body_score=70 WHERE id=?", unprofiled);
        rated(taster, catalogAcid, "APPROVED", "5.0", BASE);
        rated(taster, pendingReview, "PENDING", "4.0", BASE.plusSeconds(60));
        UUID entry = cellar(taster, cellarRated, null, "10.00");
        jdbc.update("UPDATE cellar_wines SET rating_decimal=4.5 WHERE id=?", entry);
        rated(taster, rejected, "REJECTED", "5.0", BASE.plusSeconds(120));
        rated(taster, disliked, "APPROVED", "3.0", BASE.plusSeconds(180));
        rated(taster, unprofiled, "APPROVED", "4.0", BASE.plusSeconds(240));

        JsonNode traits = json(request("GET", "/users/" + taster + "/profile", viewer)).get("data").get("tasteTraits");

        // acidity (5*80 + 4*50 + 4.5*60) / 13.5 = 64.4: the catalog's 80 beats the AI's 20; body has only 2 wines
        assertThat(traits.get("structure").toString())
                .isEqualTo(structure(trait("ACIDITY", 64, 3, false)));
        // FRUIT (5 + 4.5) / 13.5, OAK 5 / 13.5, FLORAL and SPICE 4 / 13.5; the unprofiled wine counts for none
        assertThat(traits.get("families").toString()).isEqualTo("[{\"family\":\"FRUIT\",\"percent\":70},"
                + "{\"family\":\"OAK\",\"percent\":37},{\"family\":\"FLORAL\",\"percent\":30},"
                + "{\"family\":\"SPICE\",\"percent\":30}]");
        assertThat(traits.get("fromQuiz").asBoolean()).isFalse();

        tasteProfile(newcomer, 4);
        rated(newcomer, catalogAcid, "APPROVED", "5.0", BASE);
        assertThat(json(request("GET", "/users/" + newcomer + "/profile", viewer)).get("data").get("tasteTraits")
                .isNull()).isTrue();
    }

    @Test
    void tasteTraitsReadOnlyTheTwoHundredMostRecentLikedWines() throws Exception {
        UUID viewer = member(true), taster = member(true);
        tasteProfile(taster, 5);
        UUID oldest = wine("Traits Oldest", "WHITE", null);
        jdbc.update("UPDATE wines SET sweetness_score=0 WHERE id=?", oldest);
        rated(taster, oldest, "APPROVED", "5.0", BASE);
        jdbc.update("""
                INSERT INTO wines(id,name,wine_type,is_active,sweetness_score)
                SELECT gen_random_uuid(), 'Traits Recent ' || n, 'WHITE', true, 100 FROM generate_series(1,200) n
                """);
        jdbc.update("""
                INSERT INTO reviews(publication_status,id,wine_id,user_id,rating,title,comment,created_at,updated_at)
                SELECT 'APPROVED', gen_random_uuid(), w.id, ?, 4, 'Fixture', 'Review body', ?, ?
                FROM wines w WHERE w.name LIKE 'Traits Recent %'
                """, taster, Timestamp.from(BASE.plusSeconds(60)), Timestamp.from(BASE.plusSeconds(60)));

        JsonNode traits = json(request("GET", "/users/" + taster + "/profile", viewer)).get("data").get("tasteTraits");
        assertThat(traits.get("structure").toString())
                .isEqualTo(structure(trait("SWEETNESS", 100, 200, false)));
    }

    @Test
    void theTasteQuizStartsPendingPromptsOnlyNewcomersAndNeedsASession() throws Exception {
        UUID newcomer = member(true), regular = member(true);
        tasteProfile(regular, 5);
        assertThat(request("GET", QUIZ, null).statusCode()).isEqualTo(401);
        assertThat(request("PUT", QUIZ, null, Map.of("answers", richQuiz())).statusCode()).isEqualTo(401);
        assertThat(request("POST", QUIZ + "/skip", null).statusCode()).isEqualTo(401);

        var pending = request("GET", QUIZ, newcomer);
        assertThat(pending.statusCode()).isEqualTo(200);
        JsonNode data = json(pending).get("data");
        assertThat(data.get("status").asString()).isEqualTo("PENDING");
        assertThat(data.get("answers").isNull()).isTrue();
        assertThat(data.get("shouldPrompt").asBoolean()).isTrue();
        assertThat(json(request("GET", QUIZ, regular)).get("data").get("shouldPrompt").asBoolean()).isFalse();
    }

    @Test
    void invalidQuizAnswersAreRejectedWithInvalidTasteQuizAndStoreNothing() throws Exception {
        UUID ana = member(true);
        Map<String, String> missing = richQuiz();
        missing.remove("AROMA");
        Map<String, String> unknownKey = richQuiz();
        unknownKey.put("BREAKFAST", "CITRUS");
        Map<String, String> unknownValue = richQuiz();
        unknownValue.put("FRUIT", "BANANA");
        Map<String, String> otherQuestion = richQuiz();
        otherQuestion.put("DESSERT", "CITRUS");
        for (Object body : List.of(Map.of("answers", missing), Map.of("answers", unknownKey),
                Map.of("answers", unknownValue), Map.of("answers", otherQuestion), Map.of())) {
            var response = request("PUT", QUIZ, ana, body);
            assertThat(response.statusCode()).isEqualTo(400);
            assertThat(json(response).get("code").asString()).isEqualTo("INVALID_TASTE_QUIZ");
        }
        assertThat(quizRows(ana)).isZero();
    }

    @Test
    void completingOverwritesOnRetakeAndSkippingNeverErasesACompletedQuiz() throws Exception {
        UUID ana = member(true);
        assertThat(request("PUT", QUIZ, ana, Map.of("answers", richQuiz())).statusCode()).isEqualTo(204);
        JsonNode completed = json(request("GET", QUIZ, ana)).get("data");
        assertThat(completed.get("status").asString()).isEqualTo("COMPLETED");
        assertThat(completed.get("shouldPrompt").asBoolean()).isFalse();
        assertThat(completed.get("answers").toString()).isEqualTo("{\"RAINY_DAY\":\"DARK_CHOCOLATE_COFFEE\","
                + "\"FRUIT\":\"DARK_BERRIES\",\"DESSERT\":\"BROWNIE\",\"DINNER\":\"GRILLED_RED_MEAT\","
                + "\"AROMA\":\"VANILLA_TOAST\"}");

        Map<String, String> retake = richQuiz();
        retake.put("AROMA", "CUT_GRASS");
        assertThat(request("PUT", QUIZ, ana, Map.of("answers", retake)).statusCode()).isEqualTo(204);
        assertThat(json(request("GET", QUIZ, ana)).get("data").get("answers").get("AROMA").asString())
                .isEqualTo("CUT_GRASS");
        assertThat(quizRows(ana)).isEqualTo(1);

        assertThat(request("POST", QUIZ + "/skip", ana).statusCode()).isEqualTo(204);
        JsonNode afterSkip = json(request("GET", QUIZ, ana)).get("data");
        assertThat(afterSkip.get("status").asString()).isEqualTo("COMPLETED");
        assertThat(afterSkip.get("answers").get("AROMA").asString()).isEqualTo("CUT_GRASS");
    }

    @Test
    void skippingRecordsSkippedStopsThePromptAndTheQuizCanStillBeTakenLater() throws Exception {
        UUID ana = member(true);
        assertThat(request("POST", QUIZ + "/skip", ana).statusCode()).isEqualTo(204);
        assertThat(request("POST", QUIZ + "/skip", ana).statusCode()).isEqualTo(204);
        JsonNode skipped = json(request("GET", QUIZ, ana)).get("data");
        assertThat(skipped.get("status").asString()).isEqualTo("SKIPPED");
        assertThat(skipped.get("answers").isNull()).isTrue();
        assertThat(skipped.get("shouldPrompt").asBoolean()).isFalse();
        assertThat(jdbc.queryForObject("SELECT answers IS NULL FROM user_taste_quiz WHERE user_id=?", Boolean.class,
                ana)).isTrue();

        assertThat(request("PUT", QUIZ, ana, Map.of("answers", richQuiz())).statusCode()).isEqualTo(204);
        assertThat(json(request("GET", QUIZ, ana)).get("data").get("status").asString()).isEqualTo("COMPLETED");

        jdbc.update("DELETE FROM user_roles WHERE user_id=?", ana);
        jdbc.update("DELETE FROM users WHERE id=?", ana);
        assertThat(quizRows(ana)).isZero();
    }

    @Test
    void aCompletedQuizFillsThePublicTasteTraitsWhereRealDataIsMissingWithoutExposingTheAnswers() throws Exception {
        UUID viewer = member(true), newcomer = member(true), taster = member(true);
        assertThat(request("PUT", QUIZ, newcomer, Map.of("answers", richQuiz())).statusCode()).isEqualTo(204);

        var seeded = request("GET", "/users/" + newcomer + "/profile", viewer);
        JsonNode profile = json(seeded).get("data");
        assertThat(profile.get("tasteWheel").isNull()).isTrue();
        assertThat(profile.get("affinityPercent").isNull()).isTrue();
        JsonNode traits = profile.get("tasteTraits");
        assertThat(traits.get("fromQuiz").asBoolean()).isTrue();
        assertThat(traits.get("structure").toString()).isEqualTo(structure(trait("ACIDITY", 50, 0, false),
                trait("BODY", 100, 0, false), trait("TANNIN", 100, 0, false), trait("SWEETNESS", 50, 0, false)));
        assertThat(traits.get("families").toString()).isEqualTo("[{\"family\":\"OAK\",\"percent\":67},"
                + "{\"family\":\"FRUIT\",\"percent\":17},{\"family\":\"SPICE\",\"percent\":17}]");
        assertThat(seeded.body()).doesNotContain("answers", "RAINY_DAY", "DARK_CHOCOLATE_COFFEE", "VANILLA_TOAST");
        assertThat(request("GET", "/users/" + newcomer + "/profile", newcomer).body())
                .doesNotContain("answers", "RAINY_DAY", "DARK_BERRIES");

        tasteProfile(taster, 5);
        for (int index = 0; index < 3; index++) {
            UUID acid = wine("Quiz Acid " + index, "WHITE", null);
            jdbc.update("UPDATE wines SET acidity_score=80 WHERE id=?", acid);
            rated(taster, acid, "APPROVED", "4.0", BASE.plusSeconds(index));
        }
        assertThat(request("PUT", QUIZ, taster, Map.of("answers", richQuiz())).statusCode()).isEqualTo(204);
        JsonNode blended = json(request("GET", "/users/" + taster + "/profile", viewer)).get("data").get("tasteTraits");
        assertThat(blended.get("fromQuiz").asBoolean()).isTrue();
        assertThat(blended.get("structure").toString()).isEqualTo(structure(trait("ACIDITY", 80, 3, false),
                trait("BODY", 100, 0, false), trait("TANNIN", 100, 0, false), trait("SWEETNESS", 50, 0, false)));
        assertThat(blended.get("families").get(0).get("family").asString()).isEqualTo("OAK");
    }

    @Test
    void adjustingOrResettingTheTasteTraitsNeedsASession() throws Exception {
        assertThat(request("PUT", TRAITS, null, "{\"structure\":{\"ACIDITY\":80}}").statusCode()).isEqualTo(401);
        assertThat(request("DELETE", TRAITS, null).statusCode()).isEqualTo(401);
    }

    @Test
    void aPartialAdjustmentUpsertsOnlyTheTraitsItNames() throws Exception {
        UUID ana = member(true);
        assertThat(request("PUT", TRAITS, ana, "{\"structure\":{\"ACIDITY\":80,\"BODY\":0}}").statusCode())
                .isEqualTo(204);
        assertThat(adjustments(ana)).containsExactly(Map.entry("ACIDITY", 80), Map.entry("BODY", 0));

        assertThat(request("PUT", TRAITS, ana, "{\"structure\":{\"BODY\":100,\"TANNIN\":35}}").statusCode())
                .isEqualTo(204);
        assertThat(adjustments(ana)).containsExactly(Map.entry("ACIDITY", 80), Map.entry("BODY", 100),
                Map.entry("TANNIN", 35));
    }

    @Test
    void aNullValueClearsOnlyThatTrait() throws Exception {
        UUID ana = member(true);
        request("PUT", TRAITS, ana, "{\"structure\":{\"ACIDITY\":80,\"SWEETNESS\":20}}");
        assertThat(request("PUT", TRAITS, ana, "{\"structure\":{\"ACIDITY\":null,\"BODY\":null}}").statusCode())
                .isEqualTo(204);
        assertThat(adjustments(ana)).containsExactly(Map.entry("SWEETNESS", 20));
    }

    @Test
    void invalidAdjustmentsAreRejectedWithInvalidTasteAdjustmentAndStoreNothing() throws Exception {
        UUID ana = member(true);
        request("PUT", TRAITS, ana, "{\"structure\":{\"TANNIN\":40}}");
        for (String body : List.of("{}", "{\"structure\":null}", "{\"structure\":{}}", "{\"structure\":5}",
                "{\"structure\":[80]}", "{\"structure\":{\"FRUIT\":50}}", "{\"structure\":{\"acidity\":50}}",
                "{\"structure\":{\"ACIDITY\":101}}", "{\"structure\":{\"ACIDITY\":-1}}",
                "{\"structure\":{\"ACIDITY\":80.5}}", "{\"structure\":{\"ACIDITY\":\"80\"}}",
                "{\"structure\":{\"ACIDITY\":true}}", "{\"structure\":{\"ACIDITY\":80,\"BODY\":200}}",
                "{\"structure\":{\"ACIDITY\":99999999999}}")) {
            var response = request("PUT", TRAITS, ana, body);
            assertThat(response.statusCode()).as(body).isEqualTo(400);
            assertThat(json(response).get("code").asString()).as(body).isEqualTo("INVALID_TASTE_ADJUSTMENT");
        }
        var empty = request("PUT", TRAITS, ana);
        assertThat(empty.statusCode()).isEqualTo(400);
        assertThat(json(empty).get("code").asString()).isEqualTo("INVALID_TASTE_ADJUSTMENT");
        assertThat(adjustments(ana)).containsExactly(Map.entry("TANNIN", 40));
    }

    @Test
    void resettingClearsEveryAdjustmentAndIsIdempotent() throws Exception {
        UUID ana = member(true), bea = member(true);
        request("PUT", TRAITS, ana, "{\"structure\":{\"ACIDITY\":80,\"BODY\":30}}");
        request("PUT", TRAITS, bea, "{\"structure\":{\"BODY\":30}}");
        assertThat(request("DELETE", TRAITS, ana).statusCode()).isEqualTo(204);
        assertThat(adjustments(ana)).isEmpty();
        assertThat(request("DELETE", TRAITS, ana).statusCode()).isEqualTo(204);
        assertThat(adjustments(bea)).containsExactly(Map.entry("BODY", 30));
    }

    @Test
    void aManualValueBeatsTheRealValueOfItsTrait() throws Exception {
        UUID viewer = member(true), taster = acidTaster();
        request("PUT", TRAITS, taster, "{\"structure\":{\"ACIDITY\":20}}");
        JsonNode traits = json(request("GET", "/users/" + taster + "/profile", viewer)).get("data").get("tasteTraits");
        assertThat(traits.get("structure").toString()).isEqualTo(structure(trait("ACIDITY", 20, 3, true)));
        assertThat(traits.get("fromQuiz").asBoolean()).isFalse();
    }

    @Test
    void aManualValueBeatsTheQuizValueOfItsTrait() throws Exception {
        UUID viewer = member(true), newcomer = member(true);
        request("PUT", QUIZ, newcomer, Map.of("answers", richQuiz()));
        request("PUT", TRAITS, newcomer, "{\"structure\":{\"BODY\":40}}");
        JsonNode traits = json(request("GET", "/users/" + newcomer + "/profile", viewer)).get("data")
                .get("tasteTraits");
        assertThat(traits.get("structure").toString()).isEqualTo(structure(trait("ACIDITY", 50, 0, false),
                trait("BODY", 40, 0, true), trait("TANNIN", 100, 0, false), trait("SWEETNESS", 50, 0, false)));
        assertThat(traits.get("fromQuiz").asBoolean()).isTrue();
        assertThat(traits.get("families").get(0).get("family").asString()).isEqualTo("OAK");
    }

    @Test
    void anAdjustedTraitWithoutRealOrQuizDataAppearsInTraitOrder() throws Exception {
        UUID viewer = member(true), taster = acidTaster();
        request("PUT", TRAITS, taster, "{\"structure\":{\"SWEETNESS\":70,\"BODY\":30}}");
        JsonNode traits = json(request("GET", "/users/" + taster + "/profile", viewer)).get("data").get("tasteTraits");
        assertThat(traits.get("structure").toString()).isEqualTo(structure(trait("ACIDITY", 80, 3, false),
                trait("BODY", 30, 0, true), trait("SWEETNESS", 70, 0, true)));
        JsonNode own = json(request("GET", "/users/" + taster + "/profile", taster)).get("data").get("tasteTraits");
        assertThat(own.get("structure")).isEqualTo(traits.get("structure"));
    }

    @Test
    void overridingEveryQuizTraitNoLongerCountsAsFromTheQuiz() throws Exception {
        UUID viewer = member(true), taster = member(true);
        tasteProfile(taster, 5);
        for (int index = 0; index < 3; index++) {
            UUID wine = wine("Adjusted Acid " + index, "WHITE", null);
            jdbc.update("UPDATE wines SET acidity_score=80 WHERE id=?", wine);
            aiProfile(wine, "es", "{}", "[\"Cereza negra\"]", "[]", "[]", "[]");
            rated(taster, wine, "APPROVED", "4.0", BASE.plusSeconds(index));
        }
        request("PUT", QUIZ, taster, Map.of("answers", richQuiz()));
        String path = "/users/" + taster + "/profile";
        assertThat(json(request("GET", path, viewer)).get("data").get("tasteTraits").get("fromQuiz").asBoolean())
                .isTrue();

        request("PUT", TRAITS, taster, "{\"structure\":{\"BODY\":40,\"TANNIN\":60,\"SWEETNESS\":10}}");
        JsonNode traits = json(request("GET", path, viewer)).get("data").get("tasteTraits");
        assertThat(traits.get("fromQuiz").asBoolean()).isFalse();
        assertThat(traits.get("structure").toString()).isEqualTo(structure(trait("ACIDITY", 80, 3, false),
                trait("BODY", 40, 0, true), trait("TANNIN", 60, 0, true), trait("SWEETNESS", 10, 0, true)));
        assertThat(traits.get("families").toString()).isEqualTo("[{\"family\":\"FRUIT\",\"percent\":100}]");
    }

    @Test
    void adjustmentsAloneShowTheTasteTraitsWithoutFamiliesOrTheWheel() throws Exception {
        UUID viewer = member(true), newcomer = member(true);
        String path = "/users/" + newcomer + "/profile";
        assertThat(json(request("GET", path, viewer)).get("data").get("tasteTraits").isNull()).isTrue();

        request("PUT", TRAITS, newcomer, "{\"structure\":{\"SWEETNESS\":70}}");
        JsonNode profile = json(request("GET", path, viewer)).get("data");
        assertThat(profile.get("tasteTraits").toString()).isEqualTo("{\"structure\":"
                + structure(trait("SWEETNESS", 70, 0, true)) + ",\"families\":[],\"fromQuiz\":false}");
        assertThat(profile.get("tasteWheel").isNull()).isTrue();
        assertThat(profile.get("affinityPercent").isNull()).isTrue();

        request("DELETE", TRAITS, newcomer);
        assertThat(json(request("GET", path, viewer)).get("data").get("tasteTraits").isNull()).isTrue();
    }

    @Test
    void deletingTheMemberDeletesTheirAdjustments() throws Exception {
        UUID ana = member(true);
        request("PUT", TRAITS, ana, "{\"structure\":{\"ACIDITY\":80,\"BODY\":30}}");
        assertThat(adjustments(ana)).hasSize(2);
        jdbc.update("DELETE FROM user_roles WHERE user_id=?", ana);
        jdbc.update("DELETE FROM users WHERE id=?", ana);
        assertThat(adjustments(ana)).isEmpty();
    }

    /** A member past the threshold whose only real structure trait is ACIDITY 80 from three catalog wines. */
    private UUID acidTaster() {
        UUID taster = member(true);
        tasteProfile(taster, 5);
        for (int index = 0; index < 3; index++) {
            UUID acid = wine("Acid Taster " + index, "WHITE", null);
            jdbc.update("UPDATE wines SET acidity_score=80 WHERE id=?", acid);
            rated(taster, acid, "APPROVED", "4.0", BASE.plusSeconds(index));
        }
        return taster;
    }

    /** The member's manual trait scores in trait order. */
    private Map<String, Integer> adjustments(UUID user) {
        Map<String, Integer> scores = new LinkedHashMap<>();
        jdbc.query("""
                SELECT trait, score FROM user_taste_adjustments WHERE user_id=?
                ORDER BY array_position(ARRAY['ACIDITY','BODY','TANNIN','SWEETNESS']::varchar[], trait)
                """, row -> {
                    scores.put(row.getString("trait"), row.getInt("score"));
                }, user);
        return scores;
    }

    private static String structure(String... items) {
        return "[" + String.join(",", items) + "]";
    }

    private static String trait(String trait, int score, int wines, boolean adjusted) {
        return "{\"trait\":\"" + trait + "\",\"score\":" + score + ",\"wines\":" + wines + ",\"adjusted\":" + adjusted
                + "}";
    }

    private static Map<String, String> richQuiz() {
        Map<String, String> answers = new LinkedHashMap<>();
        answers.put("RAINY_DAY", "DARK_CHOCOLATE_COFFEE");
        answers.put("FRUIT", "DARK_BERRIES");
        answers.put("DESSERT", "BROWNIE");
        answers.put("DINNER", "GRILLED_RED_MEAT");
        answers.put("AROMA", "VANILLA_TOAST");
        return answers;
    }

    private int quizRows(UUID user) {
        return jdbc.queryForObject("SELECT count(*) FROM user_taste_quiz WHERE user_id=?", Integer.class, user);
    }

    @Test
    void cellarVisibilityGuardsTheListingAndTheCountAndNeverExposesNotesOrPurchasePrice() throws Exception {
        UUID owner = member(true), follower = member(true), stranger = member(true);
        UUID winery = winery("Bodega Cellar");
        UUID older = wine("Cellar Older", "RED", winery), newer = wine("Cellar Newer", "ROSE", winery);
        UUID olderEntry = cellar(owner, older, "Bought for my birthday", "120.50");
        UUID newerEntry = cellar(owner, newer, "Gift", "80.00");
        jdbc.update("UPDATE cellar_wines SET created_at=? WHERE id=?", Timestamp.from(BASE), olderEntry);
        jdbc.update("UPDATE cellar_wines SET created_at=?, vintage=2019, rating_decimal=4.5 WHERE id=?",
                Timestamp.from(BASE.plusSeconds(60)), newerEntry);
        follow(follower, owner, BASE);

        var publicCellar = request("GET", "/users/" + owner + "/cellar?page=0&size=10", stranger);
        assertThat(publicCellar.statusCode()).isEqualTo(200);
        JsonNode page = json(publicCellar);
        assertThat(ids(page)).containsExactly(newerEntry.toString(), olderEntry.toString());
        JsonNode top = page.get("content").get(0);
        assertThat(top.get("vintage").asInt()).isEqualTo(2019);
        assertThat(top.get("rating").decimalValue()).isEqualByComparingTo("4.5");
        assertThat(top.has("addedAt")).isTrue();
        assertThat(top.get("wine").get("name").asString()).isEqualTo("Cellar Newer");
        assertThat(top.get("wine").get("type").asString()).isEqualTo("ROSE");
        assertThat(top.get("wine").get("wineryName").asString()).isEqualTo("Bodega Cellar");
        List<String> keys = new ArrayList<>();
        top.propertyNames().forEach(keys::add);
        assertThat(keys).containsExactlyInAnyOrder("id", "wine", "vintage", "rating", "addedAt");
        assertThat(publicCellar.body()).doesNotContain("notes", "purchasePrice", "birthday", "120.5");

        setVisibility(owner, "FOLLOWERS");
        assertForbidden(request("GET", "/users/" + owner + "/cellar", stranger));
        assertThat(request("GET", "/users/" + owner + "/cellar", follower).statusCode()).isEqualTo(200);
        assertThat(request("GET", "/users/" + owner + "/cellar", owner).statusCode()).isEqualTo(200);
        JsonNode strangerView = json(request("GET", "/users/" + owner + "/profile", stranger)).get("data");
        assertThat(strangerView.get("cellarVisible").asBoolean()).isFalse();
        assertThat(strangerView.get("cellarCount").isNull()).isTrue();
        assertThat(json(request("GET", "/users/" + owner + "/profile", follower)).get("data").get("cellarCount").asLong())
                .isEqualTo(2);

        setVisibility(owner, "PRIVATE");
        assertForbidden(request("GET", "/users/" + owner + "/cellar", follower));
        assertThat(request("GET", "/users/" + owner + "/cellar", owner).statusCode()).isEqualTo(200);
        JsonNode ownView = json(request("GET", "/users/" + owner + "/profile", owner)).get("data");
        assertThat(ownView.get("cellarVisible").asBoolean()).isTrue();
        assertThat(ownView.get("cellarCount").asLong()).isEqualTo(2);

        jdbc.update("INSERT INTO user_blocks(blocker_id,blocked_id) VALUES (?,?)", owner, stranger);
        setVisibility(owner, "PUBLIC");
        assertThat(request("GET", "/users/" + owner + "/cellar", stranger).statusCode()).isEqualTo(404);
    }

    @Test
    void memberReviewsListOnlyApprovedReviewsNewestFirstAndHideBlockedMembers() throws Exception {
        UUID author = member(true), viewer = member(true), blocked = member(true);
        UUID first = wine("Reviews First", "RED", null), second = wine("Reviews Second", "RED", null),
                pending = wine("Reviews Pending", "RED", null);
        UUID older = review(author, first, "APPROVED", BASE);
        UUID newer = review(author, second, "APPROVED", BASE.plusSeconds(60));
        review(author, pending, "PENDING", BASE.plusSeconds(120));
        JsonNode page = json(request("GET", "/users/" + author + "/reviews?page=0&size=10", viewer));
        assertThat(StreamSupport.stream(page.get("content").spliterator(), false)
                .map(row -> row.get("reviewId").asString()).toList()).containsExactly(newer.toString(), older.toString());
        assertThat(page.get("content").get(0).get("reviewer").get("id").asString()).isEqualTo(author.toString());
        assertThat(page.get("content").get(0).get("wine").get("name").asString()).isEqualTo("Reviews Second");
        assertThat(request("GET", "/users/" + author + "/reviews?size=51", viewer).statusCode()).isEqualTo(422);
        jdbc.update("INSERT INTO user_blocks(blocker_id,blocked_id) VALUES (?,?)", viewer, blocked);
        assertThat(request("GET", "/users/" + blocked + "/reviews", viewer).statusCode()).isEqualTo(404);
        assertThat(request("GET", "/users/" + author + "/reviews", null).statusCode()).isEqualTo(401);
    }

    @Test
    void patchMeStoresTheBioAndCellarVisibilityWhichTheOwnUserResponsesReturn() throws Exception {
        UUID ana = member(true);
        var tooLong = request("PATCH", "/users/me", ana, Map.of("bio", "a".repeat(161)));
        assertThat(tooLong.statusCode()).isEqualTo(400);
        assertThat(json(tooLong).get("code").asString()).isEqualTo("BIO_TOO_LONG");
        assertThat(request("PATCH", "/users/me", ana, Map.of("cellarVisibility", "FRIENDS")).statusCode()).isEqualTo(400);

        var updated = request("PATCH", "/users/me", ana,
                Map.of("bio", "  Sommelier in Mendoza  ", "cellarVisibility", "FOLLOWERS", "firstName", "Ana"));
        assertThat(updated.statusCode()).isEqualTo(200);
        JsonNode data = json(updated).get("data");
        assertThat(data.get("bio").asString()).isEqualTo("Sommelier in Mendoza");
        assertThat(data.get("cellarVisibility").asString()).isEqualTo("FOLLOWERS");
        assertThat(data.get("firstName").asString()).isEqualTo("Ana");
        assertThat(data.get("lastName").asString()).isEqualTo("Member");
        assertThat(jdbc.queryForMap("SELECT bio, cellar_visibility FROM users WHERE id=?", ana))
                .containsEntry("bio", "Sommelier in Mendoza").containsEntry("cellar_visibility", "FOLLOWERS");

        JsonNode me = json(request("GET", "/auth/me", ana));
        assertThat(me.get("bio").asString()).isEqualTo("Sommelier in Mendoza");
        assertThat(me.get("cellarVisibility").asString()).isEqualTo("FOLLOWERS");
        assertThat(me.get("email").asString()).isEqualTo(ana + "@example.org");

        JsonNode cleared = json(request("PATCH", "/users/me", ana, Map.of("bio", "   "))).get("data");
        assertThat(cleared.get("bio").isNull()).isTrue();
        assertThat(cleared.get("cellarVisibility").asString()).isEqualTo("FOLLOWERS");
        assertThat(cleared.get("firstName").asString()).isEqualTo("Ana");
    }

    @Test
    void everyResponseThatCarriesAnAvatarReturnsTheAbsoluteUrlClientsLoad() throws Exception {
        UUID ana = member(true), viewer = member(true), google = member(true);
        String stored = "/api/uploads/avatars/avatar_" + ana + ".webp";
        String absolute = "https://api.example.test/api/uploads/avatars/avatar_" + ana + ".webp";
        String googlePhoto = "https://lh3.googleusercontent.com/a/photo=s256-c";
        jdbc.update("UPDATE users SET profile_image_url=? WHERE id=?", stored, ana);
        jdbc.update("UPDATE users SET profile_image_url=? WHERE id=?", googlePhoto, google);
        UUID wine = wine("Avatar Malbec", "RED", null);
        UUID anaReview = review(ana, wine, "APPROVED", BASE);
        review(google, wine, "APPROVED", BASE.minusSeconds(60));
        jdbc.update("INSERT INTO review_comments(publication_status,id,review_id,user_id,content) VALUES"
                + " ('APPROVED',?,?,?,'Nice')", UUID.randomUUID(), anaReview, ana);
        follow(viewer, ana, BASE);
        follow(viewer, google, BASE.minusSeconds(60));

        JsonNode me = json(request("GET", "/auth/me", ana));
        assertThat(me.get("avatarUrl").asString()).isEqualTo(absolute);
        assertThat(me.get("profileImageUrl").asString()).isEqualTo(absolute);
        assertThat(me.get("username").asString()).isEqualTo(ana.toString());
        assertThat(me.get("email").asString()).isEqualTo(ana + "@example.org");
        JsonNode profile = json(request("GET", "/users/" + ana + "/profile", viewer)).get("data");
        assertThat(profile.get("avatarUrl").asString()).isEqualTo(absolute);
        assertThat(profile.get("fullName").asString()).isEqualTo("Fixture Member");
        assertThat(profile.get("following").asBoolean()).isTrue();

        JsonNode following = json(request("GET", "/community/users/" + viewer + "/following", viewer)).get("content");
        assertThat(following.get(0).get("avatarUrl").asString()).isEqualTo(absolute);
        assertThat(following.get(1).get("avatarUrl").asString()).as("a provider link passes through").isEqualTo(googlePhoto);
        assertThat(following.get(0).get("displayName").asString()).isEqualTo("Fixture Member");
        JsonNode feed = json(request("GET", "/community/feed", viewer)).get("content");
        assertThat(feed.get(0).get("reviewer").get("avatarUrl").asString()).isEqualTo(absolute);
        assertThat(feed.get(0).get("wine").get("name").asString()).isEqualTo("Avatar Malbec");
        JsonNode memberReviews = json(request("GET", "/users/" + ana + "/reviews", viewer)).get("content");
        assertThat(memberReviews.get(0).get("reviewer").get("avatarUrl").asString()).isEqualTo(absolute);

        JsonNode wineReviews = json(request("GET", "/wines/" + wine + "/reviews", viewer)).get("content");
        assertThat(wineReviews.get(0).get("reviewer").get("avatarUrl").asString()).isEqualTo(absolute);
        assertThat(wineReviews.get(0).get("reviewer").get("username").asString()).isEqualTo(ana.toString());
        assertThat(wineReviews.get(0).get("commentsCount").asInt()).isEqualTo(1);
        assertThat(wineReviews.get(1).get("reviewer").get("avatarUrl").asString()).isEqualTo(googlePhoto);
        JsonNode comments = json(request("GET", "/wines/" + wine + "/reviews/" + anaReview + "/comments", viewer));
        assertThat(comments.get(0).get("reviewer").get("avatarUrl").asString()).isEqualTo(absolute);
        assertThat(comments.get(0).get("content").asString()).isEqualTo("Nice");

        UUID admin = member(true);
        jdbc.update("INSERT INTO user_roles(user_id,role_id) SELECT ?,id FROM roles WHERE name='ROLE_ADMIN'", admin);
        JsonNode adminUser = json(adminRequest("/admin/users/" + ana, admin));
        assertThat(adminUser.get("avatarUrl").asString()).isEqualTo(absolute);
        assertThat(adminUser.get("email").asString()).isEqualTo(ana + "@example.org");
        JsonNode adminUsers = json(adminRequest("/admin/users?search=" + ana, admin)).get("content");
        assertThat(adminUsers.get(0).get("avatarUrl").asString()).isEqualTo(absolute);
        JsonNode adminReview = json(adminRequest("/admin/reviews/" + anaReview, admin));
        assertThat(adminReview.get("reviewer").get("avatarUrl").asString()).isEqualTo(absolute);
        assertThat(adminReview.get("title").asString()).isEqualTo("Fixture");
    }

    private HttpResponse<String> adminRequest(String path, UUID admin) throws Exception {
        List<String> permissions = jdbc.queryForList("""
                SELECT DISTINCT p.code FROM permissions p JOIN role_permissions rp ON rp.permission_id = p.id
                JOIN user_roles ur ON ur.role_id = rp.role_id WHERE ur.user_id = ?
                """, String.class, admin);
        var response = http.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api" + path))
                .timeout(Duration.ofSeconds(10))
                .header("Origin", "https://vinnot.com")
                .header("X-Vinnot-Web-Session", "1")
                .header("Authorization", "Bearer " + tokens.generateAccessToken(admin, admin + "@example.org",
                        List.of("ROLE_ADMIN", "ROLE_USER"), permissions))
                .GET().build(), HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).as(response.body()).isEqualTo(200);
        return response;
    }

    private void assertForbidden(HttpResponse<String> response) throws Exception {
        assertThat(response.statusCode()).isEqualTo(403);
        assertThat(json(response).get("code").asString()).isEqualTo("CELLAR_NOT_VISIBLE");
    }

    private void setVisibility(UUID user, String visibility) throws Exception {
        assertThat(request("PATCH", "/users/me", user, Map.of("cellarVisibility", visibility)).statusCode()).isEqualTo(200);
    }

    private UUID member(boolean verified) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users(id,username,email,password,first_name,last_name,email_verified)
                VALUES (?,?,?,?,'Fixture','Member',?)
                """, id, id.toString(), id + "@example.org", passwords.encode(UUID.randomUUID().toString()), verified);
        jdbc.update("INSERT INTO user_roles(user_id,role_id) SELECT ?,id FROM roles WHERE name='ROLE_USER'", id);
        return id;
    }

    private UUID winery(String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO wineries(id,name) VALUES (?,?)", id, name);
        return id;
    }

    private UUID wine(String name, String type, UUID winery) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO wines(id,name,wine_type,winery_id,is_active) VALUES (?,?,?,?,true)", id, name, type, winery);
        return id;
    }

    private UUID wine(String name, String type, String grapes, UUID region) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO wines(id,name,wine_type,is_active,grapes,region_id) VALUES (?,?,?,true,?::jsonb,?)",
                id, name, type, grapes, region);
        return id;
    }

    private UUID region(String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO regions(id,name,country_id) SELECT ?,?,id FROM countries WHERE code='ar'", id, name);
        return id;
    }

    private void ratedInCellar(UUID user, UUID wine, String rating) {
        jdbc.update("INSERT INTO cellar_wines(id,user_id,wine_id,rating_decimal) VALUES (?,?,?,?)",
                UUID.randomUUID(), user, wine, new BigDecimal(rating));
    }

    private UUID review(UUID user, UUID wine, String status, Instant at) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO reviews(publication_status,id,wine_id,user_id,rating,title,comment,created_at,updated_at)
                VALUES (?,?,?,?,4,'Fixture','Review body',?,?)
                """, status, id, wine, user, Timestamp.from(at), Timestamp.from(at));
        return id;
    }

    private void rated(UUID user, UUID wine, String status, String rating, Instant at) {
        jdbc.update("""
                INSERT INTO reviews(publication_status,id,wine_id,user_id,rating,title,comment,created_at,updated_at)
                VALUES (?,?,?,?,?,'Fixture','Review body',?,?)
                """, status, UUID.randomUUID(), wine, user, new BigDecimal(rating), Timestamp.from(at), Timestamp.from(at));
    }

    private void aiProfile(UUID wine, String language, String palate, String primaryAromas, String secondaryAromas,
            String primaryFlavors, String secondaryFlavors) {
        String profile = "{\"palateAnalysis\": " + palate + ", \"aromaticProfile\": {\"primaryAromas\": " + primaryAromas
                + ", \"secondaryAromas\": " + secondaryAromas + "}, \"flavorProfile\": {\"primaryFlavors\": "
                + primaryFlavors + ", \"secondaryFlavors\": " + secondaryFlavors + "}}";
        jdbc.update("INSERT INTO wine_ai_profiles(wine_id,language,profile_json) VALUES (?,?,?::jsonb)",
                wine, language, profile);
    }

    private UUID cellar(UUID user, UUID wine, String notes, String price) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO cellar_wines(id,user_id,wine_id,notes,purchase_price) VALUES (?,?,?,?,?)",
                id, user, wine, notes, new BigDecimal(price));
        return id;
    }

    private void taste(UUID user, String kind, String value, String score, int rated) {
        jdbc.update("""
                INSERT INTO user_taste_affinities(user_id,kind,value,label,score,rated_wines,computed_at)
                VALUES (?,?,?,?,?,?,now())
                """, user, kind, value, value, new BigDecimal(score), rated);
    }

    private void tasteProfile(UUID user, int rated) {
        taste(user, "TYPE", "RED", "4.00", rated);
    }

    private void follow(UUID follower, UUID followee, Instant at) {
        jdbc.update("INSERT INTO user_follows(follower_id,followee_id,created_at) VALUES (?,?,?)",
                follower, followee, Timestamp.from(at));
    }

    private int follows(UUID follower, UUID followee) {
        return jdbc.queryForObject("SELECT count(*) FROM user_follows WHERE follower_id=? AND followee_id=?",
                Integer.class, follower, followee);
    }

    private int points(UUID user) {
        return jdbc.queryForList("SELECT points FROM user_points WHERE user_id=?", Integer.class, user).stream()
                .findFirst().orElse(0);
    }

    private int pushes(String keyPattern) {
        return jdbc.queryForObject("SELECT count(*) FROM external_effects WHERE kind='PUSH_NOTIFICATION' AND"
                + " deduplication_key LIKE ?", Integer.class, keyPattern);
    }

    private static List<String> ids(JsonNode page) {
        return StreamSupport.stream(page.get("content").spliterator(), false).map(row -> row.get("id").asString()).toList();
    }

    private JsonNode json(HttpResponse<String> response) throws Exception {
        return mapper.readTree(response.body());
    }

    private HttpResponse<String> request(String method, String path, UUID user) throws Exception {
        return request(method, path, user, null);
    }

    private HttpResponse<String> request(String method, String path, UUID user, Object body) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api" + path))
                .timeout(Duration.ofSeconds(10))
                .header("Origin", "https://vinnot.com")
                .header("X-Vinnot-Web-Session", "1")
                .header("Content-Type", "application/json");
        if (Objects.nonNull(user)) {
            builder.header("Authorization", "Bearer " + tokens.generateAccessToken(user, user + "@example.org",
                    List.of("ROLE_USER"), List.of()));
        }
        String raw = body instanceof String text ? text : mapper.writeValueAsString(body);
        builder.method(method, Objects.isNull(body) ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(raw));
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }
}
