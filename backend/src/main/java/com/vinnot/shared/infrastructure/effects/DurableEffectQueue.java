package com.vinnot.shared.infrastructure.effects;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** An outbox write joins the business transaction; rolled-back decisions cannot emit effects. */
@Component
@RequiredArgsConstructor
public class DurableEffectQueue {
    private static final String INSERT = """
            INSERT INTO external_effects(id, kind, deduplication_key, payload, next_attempt_at)
            VALUES (?, ?, ?, CAST(? AS jsonb), CURRENT_TIMESTAMP + (? * INTERVAL '1 millisecond'))
            ON CONFLICT (deduplication_key) DO NOTHING
            """;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    @Transactional
    public void enqueue(String kind, String key, Map<String, Object> payload, Duration delay) {
        insert(kind, key, payload, delay);
    }

    /**
     * Many jobs of one kind in one JDBC batch (#405: the engagement planner queues a page of pushes at once), joining
     * the caller's transaction like {@link #enqueue}. A repeated key is ignored.
     */
    @Transactional
    public void enqueueAll(String kind, List<Job> jobs) {
        if (jobs.isEmpty()) {
            return;
        }
        List<Object[]> rows = new ArrayList<>(jobs.size());
        for (Job job : jobs) {
            rows.add(new Object[] {UUID.randomUUID(), kind, job.key(), json(job.payload()), job.delay().toMillis()});
        }
        jdbc.batchUpdate(INSERT, rows);
    }

    /** One job of {@link #enqueueAll}: its deduplication key, payload and delay. */
    public record Job(String key, Map<String, Object> payload, Duration delay) {
    }

    /** Orphan checks survive an upload/publication rollback. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void reconcileLater(String kind, String key, Map<String, Object> payload) {
        insert(kind, key, payload, Duration.ofHours(2));
    }

    private void insert(String kind, String key, Map<String, Object> payload, Duration delay) {
        jdbc.update(INSERT, UUID.randomUUID(), kind, key, json(payload), delay.toMillis());
    }

    private String json(Map<String, Object> payload) {
        try {
            return mapper.writeValueAsString(payload);
        } catch (JacksonException exception) {
            throw new IllegalArgumentException("External effect payload is not serializable", exception);
        }
    }
}
