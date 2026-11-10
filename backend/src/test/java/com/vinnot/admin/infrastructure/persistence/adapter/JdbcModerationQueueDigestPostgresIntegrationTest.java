package com.vinnot.admin.infrastructure.persistence.adapter;

import com.vinnot.admin.application.port.out.ModerationQueueDigest;
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

/** The moderation digest's cursor, new-work counts and staff against the real schema (V54). */
@Testcontainers(disabledWithoutDocker = true)
class JdbcModerationQueueDigestPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static JdbcTemplate jdbc;
    private static JdbcModerationQueueDigest digest;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        digest = new JdbcModerationQueueDigest(jdbc);
    }

    @Test
    void eachClaimCoversTheWorkSinceThePreviousOneAndNamesASingleItem() {
        Instant started = jdbc.queryForObject("SELECT covered_until FROM moderation_digest_cursor", Timestamp.class).toInstant();
        Instant first = Instant.now().plus(1, ChronoUnit.HOURS).truncatedTo(ChronoUnit.MILLIS);
        UUID user = user(true, "ROLE_USER");
        submission(user, "Old wine", "NEEDS_REVIEW", started.minusSeconds(60));
        submission(user, "Gran Malbec", "NEEDS_REVIEW", first.minusSeconds(60));
        submission(user, "Approved", "APPROVED", first.minusSeconds(60));
        report(user, "HARASSMENT", "OPEN", first.minusSeconds(30));
        report(user, "SPAM", "DISMISSED", first.minusSeconds(30));

        ModerationQueueDigest.Window window = digest.claim(first);
        assertThat(window).isEqualTo(new ModerationQueueDigest.Window(started, first));
        assertThat(digest.newWork(window)).isEqualTo(new ModerationQueueDigest.NewWork(1, 1, "Gran Malbec", "HARASSMENT"));

        Instant second = first.plus(15, ChronoUnit.MINUTES);
        submission(user, "A", "NEEDS_REVIEW", second.minusSeconds(20));
        submission(user, "B", "NEEDS_REVIEW", second.minusSeconds(10));
        ModerationQueueDigest.Window next = digest.claim(second);
        assertThat(next.from()).isEqualTo(first);
        assertThat(digest.newWork(next)).isEqualTo(new ModerationQueueDigest.NewWork(2, 0, null, null));
        assertThat(digest.newWork(digest.claim(second.plusSeconds(60))).isEmpty()).isTrue();
        ModerationQueueDigest.Window late = digest.claim(second);
        assertThat(late).as("an earlier clock never moves the cursor back")
                .isEqualTo(new ModerationQueueDigest.Window(second.plusSeconds(60), second.plusSeconds(60)));
    }

    @Test
    void staffAreActiveAdministratorsAndModeratorsOnce() {
        UUID admin = user(true, "ROLE_ADMIN");
        UUID moderator = user(true, "ROLE_MODERATOR");
        UUID both = user(true, "ROLE_ADMIN");
        grant(both, "ROLE_MODERATOR");
        UUID inactive = user(false, "ROLE_ADMIN");
        UUID member = user(true, "ROLE_USER");

        assertThat(digest.staff()).contains(admin, moderator, both).doesNotContain(inactive, member).doesNotHaveDuplicates();
    }

    @Test
    void suspendedStaffNoLongerGetTheDigest() {
        UUID admin = user(true, "ROLE_ADMIN");
        UUID suspendedAdmin = user(true, "ROLE_ADMIN");
        UUID suspendedModerator = user(true, "ROLE_MODERATOR");
        jdbc.update("UPDATE users SET locked = true WHERE id IN (?, ?)", suspendedAdmin, suspendedModerator);

        assertThat(digest.staff()).contains(admin).doesNotContain(suspendedAdmin, suspendedModerator);
    }

    private static void submission(UUID user, String wine, String status, Instant updatedAt) {
        jdbc.update("INSERT INTO wine_submissions(id,submitted_by,wine_name,winery_name,status,created_at,updated_at)"
                + " VALUES (?,?,?,'Bodega',?,?,?)", UUID.randomUUID(), user, wine, status, Timestamp.from(updatedAt),
                Timestamp.from(updatedAt));
    }

    private static void report(UUID reporter, String reason, String status, Instant createdAt) {
        jdbc.update("INSERT INTO community_reports(id,reporter_id,target_type,target_id,reason,description,excerpt,status,"
                + "created_at,updated_at) VALUES (?,?,'REVIEW',?,?,'','',?,?,?)", UUID.randomUUID(), reporter, UUID.randomUUID(),
                reason, status, Timestamp.from(createdAt), Timestamp.from(createdAt));
    }

    private static UUID user(boolean active, String role) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name,active) VALUES (?,?,?,'fixture','Test','Member',?)",
                id, "user-" + id, id + "@example.invalid", active);
        grant(id, role);
        return id;
    }

    private static void grant(UUID user, String role) {
        jdbc.update("INSERT INTO user_roles(user_id, role_id) SELECT ?, id FROM roles WHERE name = ?", user, role);
    }
}
