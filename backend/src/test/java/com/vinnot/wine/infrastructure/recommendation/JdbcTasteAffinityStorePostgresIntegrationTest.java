package com.vinnot.wine.infrastructure.recommendation;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.vinnot.wine.application.port.out.TasteAudience;
import com.vinnot.wine.domain.valueobject.TasteAffinity;
import com.vinnot.wine.domain.valueobject.WineType;

import static org.assertj.core.api.Assertions.assertThat;

/** Taste affinities computed against the real schema (V52). */
@Testcontainers(disabledWithoutDocker = true)
class JdbcTasteAffinityStorePostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final Instant NOW = Instant.parse("2026-10-21T06:40:00Z");
    private static JdbcTemplate jdbc;
    private static JdbcTasteAffinityStore store;
    private static DataSource source;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        store = new JdbcTasteAffinityStore(jdbc);
        source = dataSource;
    }

    @BeforeEach
    void noRatings() {
        jdbc.update("DELETE FROM reviews");
        jdbc.update("DELETE FROM cellar_wines");
    }

    @Test
    void reviewsWinOverCellarRatingsAndEachGrapeAndTypeIsAveragedPerUser() {
        UUID ana = user();
        UUID malbec = wine("RED", "[\"Malbec\"]");
        UUID blend = wine("RED", "[\"malbec \", \"Cabernet Franc\", \"Malbec\"]");
        UUID torrontes = wine("white", "[\"Torrontés\"]");
        UUID noGrapes = wine("RED", null);
        review(ana, malbec, "4.5", "APPROVED");
        cellar(ana, malbec, 2);
        review(ana, blend, "3.5", "PENDING");
        cellar(ana, torrontes, 5);
        cellar(ana, noGrapes, null);

        assertThat(store.recompute(NOW)).isEqualTo(5);

        assertThat(affinities(ana)).containsExactlyInAnyOrder(
                row("GRAPE", "cabernet franc", "Cabernet Franc", "3.50", 1),
                row("GRAPE", "malbec", "Malbec", "4.00", 2),
                row("GRAPE", "torrontés", "Torrontés", "5.00", 1),
                row("TYPE", "RED", "RED", "4.00", 2),
                row("TYPE", "WHITE", "WHITE", "5.00", 1));
        assertThat(jdbc.queryForObject("SELECT DISTINCT computed_at FROM user_taste_affinities", Timestamp.class).toInstant())
                .isEqualTo(NOW);
    }

    @Test
    void aRunWhileAnotherInstanceIsRecomputingDoesNothingAndKeepsThePreviousTable() throws SQLException {
        UUID ben = user();
        UUID wine = wine("ROSE", "[\"Pinot Noir\"]");
        cellar(ben, wine, 3);
        store.recompute(NOW);
        jdbc.update("DELETE FROM cellar_wines");

        try (Connection other = source.getConnection()) {
            other.setAutoCommit(false);
            try (var lock = other.prepareStatement("SELECT pg_advisory_xact_lock(?, ?)")) {
                lock.setInt(1, JdbcTasteAffinityStore.LOCK_NAMESPACE);
                lock.setInt(2, JdbcTasteAffinityStore.LOCK_KEY);
                lock.execute();
            }
            assertThat(store.recompute(NOW.plusSeconds(60))).isZero();
            assertThat(affinities(ben)).as("the table another run is replacing stays as it was").isNotEmpty();
            other.rollback();
        }
        store.recompute(NOW.plusSeconds(120));
        assertThat(affinities(ben)).isEmpty();
    }

    @Test
    void aRejectedReviewDoesNotCountButTheCellarRatingThenDoesAndEachRunReplacesTheTable() {
        UUID ben = user();
        UUID wine = wine("ROSE", "[\"Pinot Noir\"]");
        review(ben, wine, "5.0", "REJECTED");
        cellar(ben, wine, 3);
        store.recompute(NOW);
        assertThat(affinities(ben)).contains(row("GRAPE", "pinot noir", "Pinot Noir", "3.00", 1));

        jdbc.update("DELETE FROM cellar_wines");
        assertThat(store.recompute(NOW.plusSeconds(86_400))).isZero();
        assertThat(affinities(ben)).isEmpty();
    }

    @Test
    void strongAffinitiesMatchANewWineByGrapeFirstExceptForItsCreatorAndPeopleWhoAlreadyHaveIt() {
        UUID grapeFan = user();
        UUID typeFan = user();
        UUID lukewarm = user();
        UUID owner = user();
        UUID creator = user();
        UUID reviewer = user();
        for (int i = 0; i < 3; i++) {
            UUID malbec = wine("RED", "[\"Malbec\"]");
            review(grapeFan, malbec, "4.5", "APPROVED");
            cellar(typeFan, wine("RED", "[\"Syrah\"]"), 5);
            cellar(lukewarm, malbec, 3);
            review(owner, malbec, "5.0", "APPROVED");
            review(creator, malbec, "5.0", "APPROVED");
            review(reviewer, malbec, "5.0", "APPROVED");
        }
        review(lukewarm, wine("RED", "[\"Malbec\"]"), "5.0", "APPROVED");
        UUID newWine = UUID.randomUUID();
        cellar(owner, wine("RED", null), 1);
        jdbc.update("INSERT INTO wines(id,name,wine_type) VALUES (?,'Already known','RED')", newWine);
        cellar(owner, newWine, null);
        review(reviewer, newWine, "4.0", "PENDING");
        store.recompute(NOW);
        var audience = new PostgresTasteAudience(jdbc);

        var matches = audience.matching(new TasteAudience.Candidate(
                newWine, creator, WineType.RED, List.of(" MALBEC ", "Cabernet Franc")));

        assertThat(matches).containsExactlyInAnyOrder(
                new TasteAudience.Match(grapeFan,
                        TasteAffinity.Kind.GRAPE, "Malbec"),
                new TasteAudience.Match(typeFan,
                        TasteAffinity.Kind.TYPE, "RED"));
        assertThat(audience.matching(new TasteAudience.Candidate(
                UUID.randomUUID(), null, WineType.WHITE, List.of()))).isEmpty();
    }

    private static Map<String, Object> row(String kind, String value, String label, String score, int ratedWines) {
        return Map.of("kind", kind, "value", value, "label", label, "score", new BigDecimal(score), "rated_wines", ratedWines);
    }

    private static List<Map<String, Object>> affinities(UUID user) {
        return jdbc.queryForList("SELECT kind, value, label, score, rated_wines FROM user_taste_affinities WHERE user_id=?", user);
    }

    private static UUID wine(String type, String grapes) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO wines(id,name,wine_type,grapes) VALUES (?,?,?,?::jsonb)", id, "Wine " + id, type, grapes);
        return id;
    }

    private static void review(UUID user, UUID wine, String rating, String status) {
        jdbc.update("INSERT INTO reviews(id,wine_id,user_id,rating,publication_status) VALUES (?,?,?,?,?)",
                UUID.randomUUID(), wine, user, new BigDecimal(rating), status);
    }

    private static void cellar(UUID user, UUID wine, Integer rating) {
        jdbc.update("INSERT INTO cellar_wines(id,user_id,wine_id,rating) VALUES (?,?,?,?)", UUID.randomUUID(), user, wine, rating);
    }

    private static UUID user() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name) VALUES (?,?,?,'fixture','Test','Member')",
                id, "user-" + id, id + "@example.invalid");
        return id;
    }
}
