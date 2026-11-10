package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.application.port.out.PushTypeSwitchPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushOutcome;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Push switches with their audit, and the daily outcome counters (V59), against the real schema. */
@Testcontainers(disabledWithoutDocker = true)
class JdbcPushAdministrationPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final Instant NOW = Instant.parse("2026-10-21T12:00:00Z").truncatedTo(ChronoUnit.SECONDS);
    private static JdbcTemplate jdbc;
    private static TransactionTemplate outer;
    private static JdbcPushTypeSwitches switches;
    private static JdbcPushMetrics metrics;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        var transactions = new DataSourceTransactionManager(dataSource);
        outer = new TransactionTemplate(transactions);
        switches = new JdbcPushTypeSwitches(jdbc);
        metrics = new JdbcPushMetrics(jdbc, transactions);
    }

    @Test
    void aTypeIsOnUntilAnAdministratorTurnsItOffAndOnlyRealChangesAreAudited() {
        UUID admin = UUID.randomUUID();
        jdbc.update("INSERT INTO users (id, email, username, password, first_name, last_name) VALUES (?, ?, ?, 'hash', 'A', 'B')",
                admin, "admin-" + admin + "@vinnot.test", "admin-" + admin);
        var actor = new PushTypeSwitchPort.Actor(admin, "admin@vinnot.test");
        assertThat(switches.isEnabled(NotificationType.EVENT_NEARBY)).isTrue();

        assertThat(switches.change(NotificationType.EVENT_NEARBY, false, actor, NOW)).as("it was on").isTrue();
        assertThat(switches.change(NotificationType.EVENT_NEARBY, false, actor, NOW.plusSeconds(1))).isFalse();
        assertThat(switches.isEnabled(NotificationType.EVENT_NEARBY)).isFalse();
        assertThat(switches.disabledTypes()).containsExactly(NotificationType.EVENT_NEARBY);
        assertThat(switches.lastTurnedOn()).as("never turned back on").doesNotContainKey(NotificationType.EVENT_NEARBY);
        switches.change(NotificationType.EVENT_NEARBY, true, actor, NOW.plusSeconds(2));
        switches.change(NotificationType.EVENT_NEARBY, true, actor, NOW.plusSeconds(3));
        assertThat(switches.lastTurnedOn()).as("the last real change from off to on")
                .containsEntry(NotificationType.EVENT_NEARBY, NOW.plusSeconds(2));

        assertThat(switches.recentChanges(10)).containsExactly(
                new PushTypeSwitchPort.Change(NotificationType.EVENT_NEARBY, false, true, "admin@vinnot.test", NOW.plusSeconds(2)),
                new PushTypeSwitchPort.Change(NotificationType.EVENT_NEARBY, true, false, "admin@vinnot.test", NOW));
        jdbc.update("DELETE FROM users WHERE id = ?", admin);
        assertThat(switches.recentChanges(1)).as("the audit outlives the account")
                .extracting(PushTypeSwitchPort.Change::changedBy).containsExactly("admin@vinnot.test");
    }

    @Test
    void outcomesAddUpPerDayAndSurviveTheirJobsRollback() {
        try {
            outer.executeWithoutResult(status -> {
                metrics.record(NotificationType.EVENT_REMINDER, Map.of(PushOutcome.SENT, 2, PushOutcome.FAILED, 0), NOW);
                throw new IllegalStateException("provider down");
            });
        } catch (IllegalStateException expected) {
            // the job failed after the batch was handed to the provider
        }
        metrics.record(NotificationType.EVENT_REMINDER, Map.of(PushOutcome.SENT, 3, PushOutcome.EXPIRED, 1), NOW);
        metrics.record(NotificationType.EVENT_REMINDER, Map.of(PushOutcome.SENT, 4), NOW.minus(2, ChronoUnit.DAYS));
        metrics.record(NotificationType.EVENT_REMINDER, Map.of(), NOW);

        assertThat(metrics.totalsSince(LocalDate.parse("2026-10-21")))
                .isEqualTo(Map.of(NotificationType.EVENT_REMINDER, Map.of(PushOutcome.SENT, 5L, PushOutcome.EXPIRED, 1L)));
        assertThat(metrics.totalsSince(LocalDate.parse("2026-10-19")).get(NotificationType.EVENT_REMINDER))
                .containsEntry(PushOutcome.SENT, 9L);
        jdbc.update("INSERT INTO push_delivery_outcomes VALUES ('2026-10-21', 'RETIRED_TYPE', 'SENT', 1)");
        assertThat(metrics.totalsSince(LocalDate.parse("2026-10-21"))).as("unknown types are left out")
                .containsOnlyKeys(NotificationType.EVENT_REMINDER);
    }
}
