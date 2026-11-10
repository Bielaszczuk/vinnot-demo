package com.vinnot.shared.infrastructure.effects;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** #405: a page of planned pushes is queued in one batch, each job with its own delay; a repeated key is ignored. */
@Testcontainers(disabledWithoutDocker = true)
class DurableEffectQueueBatchPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static JdbcTemplate jdbc;
    private static DurableEffectQueue queue;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        queue = new DurableEffectQueue(jdbc, new ObjectMapper());
    }

    @Test
    void eachJobKeepsItsPayloadAndDelayAndARepeatedKeyIsIgnored() {
        queue.enqueue("BATCH", "batch:existing", Map.of("n", 0), Duration.ZERO);

        queue.enqueueAll("BATCH", List.of(new DurableEffectQueue.Job("batch:now", Map.of("n", 1), Duration.ZERO),
                new DurableEffectQueue.Job("batch:later", Map.of("n", 2), Duration.ofHours(12)),
                new DurableEffectQueue.Job("batch:existing", Map.of("n", 3), Duration.ZERO)));
        queue.enqueueAll("BATCH", List.of());

        assertThat(jdbc.queryForList("SELECT deduplication_key || '=' || (payload->>'n') FROM external_effects"
                + " WHERE kind = 'BATCH' ORDER BY deduplication_key", String.class))
                .containsExactly("batch:existing=0", "batch:later=2", "batch:now=1");
        assertThat(jdbc.queryForObject("SELECT next_attempt_at - created_at > INTERVAL '11 hours' FROM external_effects"
                + " WHERE deduplication_key = 'batch:later'", Boolean.class)).isTrue();
        assertThat(jdbc.queryForObject("SELECT next_attempt_at - created_at < INTERVAL '1 minute' FROM external_effects"
                + " WHERE deduplication_key = 'batch:now'", Boolean.class)).isTrue();
    }
}
