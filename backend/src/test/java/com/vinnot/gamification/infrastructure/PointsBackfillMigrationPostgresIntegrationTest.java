package com.vinnot.gamification.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/** V70 backfills points from content that already exists, as production has it. */
@Testcontainers(disabledWithoutDocker = true)
class PointsBackfillMigrationPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    /** 12:00 in Buenos Aires. */
    private static final Instant NOON = Instant.parse("2026-01-05T15:00:00Z");
    private static final String LONG_NOTE = "x".repeat(80);

    @Test
    void existingContentEarnsWithTheLiveRulesAndCapsWithoutAnyPush() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        var jdbc = new JdbcTemplate(dataSource);
        flyway(dataSource, "69").migrate();

        UUID prolific = user(jdbc, null);
        for (int index = 0; index < 15; index++) {
            review(jdbc, prolific, wine(jdbc), "APPROVED", null, NOON.plusSeconds(index));
        }
        jdbc.update("""
                INSERT INTO wine_submissions(id, submitted_by, wine_name, winery_name, status, reviewed_at)
                VALUES (?, ?, 'Submitted', 'Winery', 'APPROVED', ?)
                """, UUID.randomUUID(), prolific, Timestamp.from(NOON.plusSeconds(60)));
        jdbc.update("""
                INSERT INTO wine_submissions(id, submitted_by, wine_name, winery_name, status)
                VALUES (?, ?, 'Pending', 'Winery', 'PENDING')
                """, UUID.randomUUID(), prolific);

        UUID liked = user(jdbc, null);
        UUID likedReview = review(jdbc, liked, wine(jdbc), "APPROVED", LONG_NOTE, NOON.minusSeconds(86_400 * 3));
        review(jdbc, liked, wine(jdbc), "PENDING", LONG_NOTE, NOON);
        review(jdbc, liked, wine(jdbc), "REJECTED", null, NOON);
        // 23:30 and 00:30 in Buenos Aires: two local days, one UTC day.
        Instant lateEvening = Instant.parse("2026-01-11T02:30:00Z");
        for (int index = 0; index < 7; index++) {
            Instant at = index < 4 ? lateEvening.plusSeconds(index) : lateEvening.plusSeconds(3600 + index);
            like(jdbc, likedReview, index == 0 ? liked : user(jdbc, null), at);
        }

        UUID commenter = user(jdbc, null);
        UUID commenterReview = review(jdbc, commenter, wine(jdbc), "APPROVED", null, NOON.minusSeconds(86_400 * 5));
        comment(jdbc, commenterReview, commenter, "APPROVED", NOON);
        for (int index = 0; index < 4; index++) {
            comment(jdbc, likedReview, commenter, "APPROVED", NOON.plusSeconds(index));
        }
        comment(jdbc, likedReview, commenter, "PENDING", NOON.minusSeconds(86_400));

        UUID collector = user(jdbc, "Europe/Madrid");
        UUID reviewedBottle = wine(jdbc);
        Instant shelvedAt = NOON.minusSeconds(86_400 * 10);
        review(jdbc, collector, reviewedBottle, "APPROVED", null, shelvedAt);
        cellar(jdbc, collector, reviewedBottle, 4, shelvedAt.plusSeconds(1));
        cellar(jdbc, collector, wine(jdbc), 3, shelvedAt);
        UUID laterReviewed = wine(jdbc);
        cellar(jdbc, collector, laterReviewed, null, shelvedAt);
        review(jdbc, collector, laterReviewed, "APPROVED", null, shelvedAt.plusSeconds(86_400));
        UUID event = event(jdbc, prolific);
        registration(jdbc, event, collector, "CONFIRMED");
        registration(jdbc, event, liked, "CANCELLED");
        jdbc.update("UPDATE users SET profile_image_url='https://cdn.example.org/c.jpg', phone_number='+5491123456789' "
                + "WHERE id=?", collector);
        UUID withoutPhone = user(jdbc, null);
        jdbc.update("UPDATE users SET profile_image_url='https://cdn.example.org/p.jpg' WHERE id=?", withoutPhone);
        UUID idle = user(jdbc, null);
        // A stored zone PostgreSQL does not know must not break the migration: that day counts in Buenos Aires,
        // the zone the runtime falls back to.
        UUID elsewhere = user(jdbc, "Mars/Olympus_Mons");
        review(jdbc, elsewhere, wine(jdbc), "APPROVED", null, NOON);

        flyway(dataSource, "latest").migrate();

        assertThat(points(jdbc, prolific)).containsEntry("points", 48).containsEntry("current_tier", "PARRA")
                .containsEntry("highest_tier_reached", "PARRA").containsEntry("highest_tier_celebrated", "PARRA")
                .containsEntry("welcome_seen", false);
        assertThat(earned(jdbc, prolific, "REVIEW")).isEqualTo(40);
        assertThat(earned(jdbc, prolific, "WINE_APPROVED")).isEqualTo(8);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_point_awards WHERE user_id=? AND points=1",
                Integer.class, prolific)).as("the 14th review is clamped to the cap").isEqualTo(1);

        assertThat(earned(jdbc, liked, "REVIEW")).isEqualTo(3);
        assertThat(earned(jdbc, liked, "REVIEW_NOTE")).isEqualTo(2);
        assertThat(earned(jdbc, liked, "LIKE_RECEIVED")).as("4 one night and 3 after midnight").isEqualTo(7);
        assertThat(earned(jdbc, liked, "EVENT_REGISTRATION")).isZero();
        assertThat(points(jdbc, liked)).containsEntry("points", 12).containsEntry("current_tier", "BROTE");

        assertThat(earned(jdbc, commenter, "COMMENT")).as("three a day, never on an own review").isEqualTo(3);
        assertThat(earned(jdbc, commenter, "REVIEW")).isEqualTo(3);

        assertThat(earned(jdbc, collector, "CELLAR_ADD")).as("the entry its review created earns nothing").isEqualTo(2);
        assertThat(earned(jdbc, collector, "EVENT_REGISTRATION")).isEqualTo(4);
        assertThat(earned(jdbc, collector, "PROFILE_COMPLETE")).isEqualTo(5);
        assertThat(points(jdbc, collector)).containsEntry("points", 17);
        assertThat(earned(jdbc, withoutPhone, "PROFILE_COMPLETE")).as("a photo and names without a phone").isZero();

        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_points WHERE user_id=?", Integer.class, idle)).isZero();
        assertThat(earned(jdbc, elsewhere, "REVIEW")).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_points p WHERE p.points <> "
                + "(SELECT SUM(m.points) FROM user_point_movements m WHERE m.user_id = p.user_id)", Integer.class))
                .isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM external_effects WHERE deduplication_key LIKE "
                + "'push:tier-reached:%'", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM wine_label_scans", Integer.class)).isZero();
    }

    private static Flyway flyway(DriverManagerDataSource dataSource, String target) {
        return Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").target(target).load();
    }

    private static Map<String, Object> points(JdbcTemplate jdbc, UUID user) {
        return jdbc.queryForMap("""
                SELECT points, current_tier, highest_tier_reached, highest_tier_celebrated, welcome_seen
                FROM user_points WHERE user_id=?
                """, user);
    }

    private static int earned(JdbcTemplate jdbc, UUID user, String source) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(points), 0) FROM user_point_awards WHERE user_id=? AND source=?",
                Integer.class, user, source);
    }

    private static UUID user(JdbcTemplate jdbc, String zone) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name) VALUES (?,?,?,'fixture','Test','Member')",
                id, "user-" + id, id + "@example.invalid");
        if (Objects.nonNull(zone)) {
            jdbc.update("UPDATE users SET timezone=? WHERE id=?", zone, id);
        }
        return id;
    }

    private static UUID wine(JdbcTemplate jdbc) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO wines(id,name,wine_type,is_active) VALUES (?,'Backfill','RED',true)", id);
        return id;
    }

    private static UUID review(JdbcTemplate jdbc, UUID user, UUID wine, String status, String note, Instant at) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO reviews(id, wine_id, user_id, rating, comment, publication_status, created_at, updated_at)
                VALUES (?, ?, ?, 4, ?, ?, ?, ?)
                """, id, wine, user, note, status, Timestamp.from(at), Timestamp.from(at));
        return id;
    }

    private static void like(JdbcTemplate jdbc, UUID review, UUID user, Instant at) {
        jdbc.update("INSERT INTO review_likes(id, review_id, user_id, created_at) VALUES (?, ?, ?, ?)",
                UUID.randomUUID(), review, user, Timestamp.from(at));
    }

    private static void comment(JdbcTemplate jdbc, UUID review, UUID user, String status, Instant at) {
        jdbc.update("""
                INSERT INTO review_comments(id, review_id, user_id, content, publication_status, created_at)
                VALUES (?, ?, ?, 'Nice', ?, ?)
                """, UUID.randomUUID(), review, user, status, Timestamp.from(at));
    }

    private static void cellar(JdbcTemplate jdbc, UUID user, UUID wine, Integer rating, Instant at) {
        jdbc.update("INSERT INTO cellar_wines(id, user_id, wine_id, rating, created_at) VALUES (?, ?, ?, ?, ?)",
                UUID.randomUUID(), user, wine, rating, Timestamp.from(at));
    }

    private static UUID event(JdbcTemplate jdbc, UUID organizer) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO events(id,title,event_type,start_date,end_date,organizer_id,status)
                VALUES (?,'Tasting','TASTING',now()+interval '2 days',now()+interval '3 days',?,'PUBLISHED')
                """, id, organizer);
        return id;
    }

    private static void registration(JdbcTemplate jdbc, UUID event, UUID user, String status) {
        jdbc.update("""
                INSERT INTO event_registrations(id,event_id,user_id,attendee_count,status,payment_status,currency,
                    created_at,updated_at) VALUES (?,?,?,1,?,'NOT_REQUIRED','ARS',now(),now())
                """, UUID.randomUUID(), event, user, status);
    }
}
