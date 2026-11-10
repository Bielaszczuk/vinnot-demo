package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.application.model.PushOpen;
import com.vinnot.notification.domain.model.NotificationType;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers(disabledWithoutDocker = true)
class JdbcPushOpenStorePostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final Instant NOW = Instant.parse("2026-10-20T21:00:00Z");
    private static JdbcTemplate jdbc;
    private static JdbcPushOpenStore store;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        store = new JdbcPushOpenStore(jdbc);
    }

    @Test
    void aPushIsStoredOnceWithItsFirstOpen() {
        UUID user = user();

        assertThat(store.save(user, "wine-recommendation:1", NotificationType.WINE_RECOMMENDATION, NOW)).isTrue();
        assertThat(store.save(user, "wine-recommendation:1", NotificationType.WINE_RECOMMENDATION, NOW.plusSeconds(60)))
                .isFalse();
        assertThat(store.save(user(), "wine-recommendation:1", NotificationType.WINE_RECOMMENDATION, NOW))
                .as("same ref, another user").isTrue();

        assertThat(store.findSince(List.of(user), Set.of(NotificationType.WINE_RECOMMENDATION), NOW.minusSeconds(1)))
                .containsExactly(new PushOpen(user, "wine-recommendation:1", NotificationType.WINE_RECOMMENDATION, NOW));
    }

    @Test
    void opensAreReadPerUserAndTypeSinceAnInstantNewestFirst() {
        UUID ana = user();
        UUID bruno = user();
        store.save(ana, "event-nearby:a", NotificationType.EVENT_NEARBY, NOW.minusSeconds(120));
        store.save(ana, "event-nearby:b", NotificationType.EVENT_NEARBY, NOW);
        store.save(ana, "review-comment:c", NotificationType.REVIEW_COMMENT, NOW);
        store.save(ana, "event-nearby:old", NotificationType.EVENT_NEARBY, NOW.minus(Duration.ofDays(10)));
        store.save(bruno, "event-nearby:d", NotificationType.EVENT_NEARBY, NOW);

        assertThat(store.findSince(List.of(ana), Set.of(NotificationType.EVENT_NEARBY), NOW.minus(Duration.ofDays(1))))
                .extracting(PushOpen::ref).containsExactly("event-nearby:b", "event-nearby:a");
        assertThat(store.findSince(List.of(ana, bruno),
                Set.of(NotificationType.EVENT_NEARBY, NotificationType.REVIEW_COMMENT), NOW.minus(Duration.ofDays(1))))
                .hasSize(4);
        assertThat(store.findSince(List.of(), Set.of(NotificationType.EVENT_NEARBY), NOW)).isEmpty();
    }

    @Test
    void countsOpensPerTypeSinceAnInstant() {
        Instant since = Instant.parse("2031-01-01T00:00:00Z");
        store.save(user(), "a", NotificationType.TERMS_UPDATED, since.plusSeconds(1));
        store.save(user(), "b", NotificationType.TERMS_UPDATED, since.plusSeconds(2));
        store.save(user(), "c", NotificationType.EVENT_REMINDER, since.plusSeconds(3));
        store.save(user(), "d", NotificationType.EVENT_REMINDER, since.minusSeconds(1));

        assertThat(store.countByTypeSince(since)).containsExactlyInAnyOrderEntriesOf(Map.of(
                NotificationType.TERMS_UPDATED, 2L, NotificationType.EVENT_REMINDER, 1L));
    }

    @Test
    void opensOfAnAccountThatNoLongerExistsAreIgnoredAndDeletingAnAccountDeletesThem() {
        assertThat(store.save(UUID.randomUUID(), "x", NotificationType.EVENT_NEARBY, NOW)).isFalse();
        UUID user = user();
        store.save(user, "y", NotificationType.EVENT_NEARBY, NOW);

        jdbc.update("DELETE FROM users WHERE id=?", user);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM push_opens WHERE user_id=?", Integer.class, user)).isZero();
    }

    @Test
    void retentionDeletesOpensOlderThanTheWindowInBatches() {
        UUID user = user();
        Instant now = Instant.parse("2002-01-01T00:00:00Z");
        Duration retention = Duration.ofDays(180);
        for (int i = 0; i < 3; i++) {
            store.save(user, "old-" + i, NotificationType.EVENT_NEARBY, now.minus(retention).minusSeconds(i + 1));
        }
        store.save(user, "recent", NotificationType.EVENT_NEARBY, now.minus(retention).plusSeconds(1));
        var retentionJob = new JdbcPushOpenRetention(jdbc, retention, 2, Clock.fixed(now, ZoneOffset.UTC));

        assertThat(retentionJob.purgeExpired()).isEqualTo(3);

        assertThat(jdbc.queryForList("SELECT ref FROM push_opens WHERE user_id=?", String.class, user))
                .containsExactly("recent");
        assertThatThrownBy(() -> new JdbcPushOpenRetention(jdbc, Duration.ZERO, 2, Clock.systemUTC()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static UUID user() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name) VALUES (?,?,?,'fixture','Test','Member')",
                id, "user-" + id, id + "@example.invalid");
        return id;
    }
}
