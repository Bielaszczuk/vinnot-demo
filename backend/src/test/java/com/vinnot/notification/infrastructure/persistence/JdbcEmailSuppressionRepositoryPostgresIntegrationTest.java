package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.domain.model.EmailSuppressionReason;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers(disabledWithoutDocker = true)
class JdbcEmailSuppressionRepositoryPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static JdbcTemplate jdbc;
    private static JdbcEmailSuppressionRepository repository;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        repository = new JdbcEmailSuppressionRepository(jdbc);
    }

    @Test
    void matchesIgnoringCaseAndSpacesAndStoresNoReadableAddress() {
        repository.suppress(" Bounced@Example.TEST ", EmailSuppressionReason.HARD_BOUNCE);

        assertThat(repository.isSuppressed("bounced@example.test")).isTrue();
        assertThat(repository.isSuppressed("other@example.test")).isFalse();
        String stored = jdbc.queryForObject("SELECT address_hash || reason FROM email_suppressions"
                + " WHERE address_hash = ?", String.class, JdbcEmailSuppressionRepository.fingerprint("bounced@example.test"));
        assertThat(stored).doesNotContain("bounced", "example").endsWith("HARD_BOUNCE");
    }

    @Test
    void aRepeatedEventKeepsTheFirstReasonAndOneRow() {
        repository.suppress("twice@example.test", EmailSuppressionReason.HARD_BOUNCE);
        repository.suppress("TWICE@example.test", EmailSuppressionReason.COMPLAINT);

        var rows = jdbc.queryForList("SELECT reason FROM email_suppressions WHERE address_hash = ?", String.class,
                JdbcEmailSuppressionRepository.fingerprint("twice@example.test"));
        assertThat(rows).containsExactly("HARD_BOUNCE");
    }

    @Test
    void theTableRejectsUnknownReasons() {
        assertThatThrownBy(() -> jdbc.update("INSERT INTO email_suppressions (address_hash, reason) VALUES (?, 'SOFT')",
                "0".repeat(64))).isInstanceOf(DataAccessException.class);
    }
}
