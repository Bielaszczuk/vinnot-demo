package com.vinnot.marketing.infrastructure.persistence;

import com.vinnot.marketing.domain.model.PillarPerformance;
import com.vinnot.marketing.domain.model.PublicationMetrics;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.marketing.domain.model.SocialPublication;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * #510 S6 and S7 (V82): one metrics snapshot per publication and day, the latest of each publication, and each pillar's
 * totals from the latest snapshots.
 */
@Testcontainers(disabledWithoutDocker = true)
class JdbcSocialMetricsRepositoryPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final Instant NOW = Instant.parse("2026-11-03T22:00:00Z");
    private static final LocalDate MONDAY = LocalDate.of(2026, 11, 2);
    private static final LocalDate TUESDAY = LocalDate.of(2026, 11, 3);
    private static final PublicationMetrics FIRST_DAY = new PublicationMetrics(100L, 80L, 10L, 2L, 1L, 1L, null);
    private static final PublicationMetrics SECOND_DAY = new PublicationMetrics(300L, 250L, 20L, 4L, 3L, 2L, 1L);
    private static JdbcTemplate jdbc;
    private static JdbcSocialPostRepository posts;
    private static JdbcSocialPublicationRepository publications;
    private static JdbcSocialMetricsRepository metrics;
    private static int slot;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        posts = new JdbcSocialPostRepository(jdbc, new ObjectMapper());
        publications = new JdbcSocialPublicationRepository(jdbc);
        metrics = new JdbcSocialMetricsRepository(jdbc);
    }

    @BeforeEach
    void clean() {
        jdbc.update("DELETE FROM social_posts");
    }

    @Test
    void aDaysSnapshotIsReplacedAndTheLatestDayWins() {
        UUID instagram = publication(post("CURIOUS_FACT"), SocialNetwork.INSTAGRAM, NOW);
        UUID facebook = publication(post("CURIOUS_FACT"), SocialNetwork.FACEBOOK, NOW);

        metrics.saveSnapshot(instagram, MONDAY, new PublicationMetrics(1L, null, null, null, null, null, null), NOW);
        metrics.saveSnapshot(instagram, MONDAY, FIRST_DAY, NOW.plusSeconds(60));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM social_post_metrics WHERE publication_id = ?", Integer.class, instagram))
                .as("one snapshot per day").isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT captured_at FROM social_post_metrics WHERE publication_id = ?", Timestamp.class, instagram)
                .toInstant())
                .isEqualTo(NOW.plusSeconds(60));
        assertThat(metrics.latestByPublication(List.of(instagram))).isEqualTo(Map.of(instagram, FIRST_DAY));

        metrics.saveSnapshot(instagram, TUESDAY, SECOND_DAY, NOW.plusSeconds(86_400));
        metrics.saveSnapshot(facebook, MONDAY, FIRST_DAY, NOW);

        assertThat(metrics.latestByPublication(List.of(instagram, facebook, UUID.randomUUID())))
                .isEqualTo(Map.of(instagram, SECOND_DAY, facebook, FIRST_DAY));
        assertThat(metrics.latestByPublication(List.of())).isEmpty();
    }

    @Test
    void eachPillarSumsTheLatestSnapshotOfItsPublicationsInTheWindow() {
        UUID fact = post("CURIOUS_FACT");
        UUID factInstagram = publication(fact, SocialNetwork.INSTAGRAM, NOW);
        UUID factThreads = publication(fact, SocialNetwork.THREADS, NOW);
        metrics.saveSnapshot(factInstagram, MONDAY, FIRST_DAY, NOW);
        metrics.saveSnapshot(factInstagram, TUESDAY, SECOND_DAY, NOW);
        metrics.saveSnapshot(factThreads, TUESDAY, new PublicationMetrics(50L, null, 5L, null, null, 1L, null), NOW);

        UUID otherFact = post("CURIOUS_FACT");
        metrics.saveSnapshot(publication(otherFact, SocialNetwork.FACEBOOK, NOW), TUESDAY,
                new PublicationMetrics(10L, null, 1L, 0L, null, null, null), NOW);

        UUID quiz = post("QUIZ");
        metrics.saveSnapshot(publication(quiz, SocialNetwork.TIKTOK, NOW), TUESDAY,
                new PublicationMetrics(null, null, 7L, 1L, null, null, null), NOW);

        UUID old = post("QUIZ");
        metrics.saveSnapshot(publication(old, SocialNetwork.INSTAGRAM, NOW.minusSeconds(100 * 86_400L)), MONDAY, SECOND_DAY, NOW);
        publication(post("EDUCATION"), SocialNetwork.INSTAGRAM, NOW);

        List<PillarPerformance> performance = metrics.pillarPerformance(NOW.minusSeconds(90 * 86_400L));

        assertThat(performance).containsExactly(
                new PillarPerformance("CURIOUS_FACT", 2, 300L + 50L + 10L, 29L + 6L + 1L),
                new PillarPerformance("QUIZ", 0, 0L, 8L));
        assertThat(metrics.pillarPerformance(NOW.plusSeconds(1))).as("nothing published since").isEmpty();
    }

    @Test
    void aPostIsMeasuredWhenAnyOfItsSnapshotsHasViews() {
        UUID quiz = post("QUIZ");
        UUID tiktok = publication(quiz, SocialNetwork.TIKTOK, NOW);
        metrics.saveSnapshot(tiktok, MONDAY, new PublicationMetrics(40L, null, 2L, null, null, null, null), NOW);
        metrics.saveSnapshot(tiktok, TUESDAY, new PublicationMetrics(null, null, 3L, null, null, null, null), NOW);

        assertThat(metrics.pillarPerformance(NOW.minusSeconds(86_400))).containsExactly(new PillarPerformance("QUIZ", 1, 0L, 3L));
    }

    @Test
    void deletingAPublicationDeletesItsSnapshots() {
        UUID instagram = publication(post("CURIOUS_FACT"), SocialNetwork.INSTAGRAM, NOW);
        metrics.saveSnapshot(instagram, MONDAY, FIRST_DAY, NOW);

        jdbc.update("DELETE FROM social_posts");

        assertThat(jdbc.queryForObject("SELECT count(*) FROM social_post_metrics", Integer.class)).isZero();
    }

    private static UUID publication(UUID post, SocialNetwork network, Instant publishedAt) {
        SocialPublication publication = SocialPublication.queued(UUID.randomUUID(), post, network, publishedAt);
        publication.started(publishedAt);
        publication.published("id-" + UUID.randomUUID(), null, publishedAt);
        publications.save(publication);
        return publication.id();
    }

    private static UUID post(String pillar) {
        slot++;
        SocialPost post = SocialPost.planned(UUID.randomUUID(), NOW.plusSeconds(slot * 3600L), pillar, null, NOW);
        posts.save(post);
        return post.id();
    }
}
