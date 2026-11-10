package com.vinnot.review.infrastructure.persistence.adapter;

import com.vinnot.review.application.port.out.ReviewLikeSummaryPort;
import com.vinnot.review.domain.model.LikeSummaryCadence;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** The likes summaries' cursors and per-author counts against the real schema (V55). */
@Testcontainers(disabledWithoutDocker = true)
class JdbcReviewLikeSummaryAdapterPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static JdbcTemplate jdbc;
    private static JdbcReviewLikeSummaryAdapter likes;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        likes = new JdbcReviewLikeSummaryAdapter(jdbc);
    }

    @Test
    void eachCadenceHasItsOwnCursorThatNeverMovesBack() {
        Instant started = jdbc.queryForObject("SELECT covered_until FROM review_like_summary_cursor WHERE cadence = 'WEEKLY'",
                Timestamp.class).toInstant();
        Instant now = Instant.now().plus(2, ChronoUnit.DAYS).truncatedTo(ChronoUnit.MILLIS);

        assertThat(likes.claim(LikeSummaryCadence.WEEKLY, now)).isEqualTo(new ReviewLikeSummaryPort.Window(started, now));
        assertThat(likes.claim(LikeSummaryCadence.WEEKLY, now.minusSeconds(60)))
                .as("an earlier clock never moves the cursor back").isEqualTo(new ReviewLikeSummaryPort.Window(now, now));
        assertThat(jdbc.queryForObject("SELECT covered_until FROM review_like_summary_cursor WHERE cadence = 'DAILY'",
                Timestamp.class).toInstant()).as("the daily cursor is untouched").isBefore(now);
    }

    @Test
    void likesAreSummarizedPerAuthorWithoutSelfLikesBlocksUnpublishedReviewsOrHiddenWines() {
        Instant from = Instant.parse("2030-01-01T00:00:00Z");
        Instant to = from.plus(1, ChronoUnit.DAYS);
        UUID malbec = wine("Gran Malbec");
        UUID torrontes = wine("Torrontés");
        UUID ana = user("Ana", "Gómez");
        UUID bruno = user("Bruno", "Díaz");
        UUID carla = user("Carla", "Ruiz");
        UUID dario = user("Darío", "Sosa");
        UUID blocked = user("Eva", "Paz");

        UUID anaMalbec = review(malbec, ana, "APPROVED");
        UUID anaTorrontes = review(torrontes, ana, "APPROVED");
        like(anaMalbec, bruno, from.plusSeconds(10));
        like(anaMalbec, carla, from.plusSeconds(20));
        like(anaTorrontes, dario, from.plusSeconds(30));
        like(anaTorrontes, ana, from.plusSeconds(40));
        like(anaTorrontes, blocked, from.plusSeconds(50));
        jdbc.update("INSERT INTO user_blocks(blocker_id, blocked_id) VALUES (?, ?)", blocked, ana);
        like(anaMalbec, dario, from.minusSeconds(1));
        like(anaMalbec, ana, to.plusSeconds(1));

        UUID brunoTorrontes = review(torrontes, bruno, "APPROVED");
        like(brunoTorrontes, carla, to);
        UUID carlaPending = review(malbec, carla, "PENDING");
        like(carlaPending, bruno, from.plusSeconds(10));
        UUID hidden = wine("Retirado");
        jdbc.update("UPDATE wines SET is_active = false WHERE id = ?", hidden);
        like(review(hidden, dario, "APPROVED"), ana, from.plusSeconds(10));

        assertThat(likes.likesIn(new ReviewLikeSummaryPort.Window(from, to))).containsExactlyInAnyOrder(
                new ReviewLikeSummaryPort.AuthorLikes(ana, 3, 2, malbec, "Gran Malbec", null),
                new ReviewLikeSummaryPort.AuthorLikes(bruno, 1, 1, torrontes, "Torrontés", carla));
    }

    private static UUID wine(String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO wines(id,name,wine_type,is_active) VALUES (?,?,'RED',true)", id, name);
        return id;
    }

    private static UUID user(String firstName, String lastName) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name,active) VALUES (?,?,?,'fixture',?,?,true)",
                id, "user-" + id, id + "@example.invalid", firstName, lastName);
        return id;
    }

    private static UUID review(UUID wine, UUID author, String status) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO reviews(id,wine_id,user_id,rating,publication_status) VALUES (?,?,?,4,?)", id, wine, author, status);
        return id;
    }

    private static void like(UUID review, UUID user, Instant at) {
        jdbc.update("INSERT INTO review_likes(id,review_id,user_id,created_at) VALUES (?,?,?,?) ON CONFLICT (review_id,user_id) DO NOTHING",
                UUID.randomUUID(), review, user, Timestamp.from(at));
    }
}
