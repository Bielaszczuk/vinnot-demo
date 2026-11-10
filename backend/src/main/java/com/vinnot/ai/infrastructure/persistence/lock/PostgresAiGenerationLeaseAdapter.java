package com.vinnot.ai.infrastructure.persistence.lock;

import com.vinnot.ai.application.port.out.AiGenerationLeasePort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

/** PostgreSQL-backed expiring lease used to deduplicate paid AI requests. */
@Component
@RequiredArgsConstructor
public class PostgresAiGenerationLeaseAdapter implements AiGenerationLeasePort {

    private final JdbcTemplate jdbcTemplate;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<Lease> tryAcquire(String key, Duration duration) {
        UUID ownerId = UUID.randomUUID();
        int updated = jdbcTemplate.update("""
                INSERT INTO ai_generation_leases (lock_key, owner_id, expires_at)
                VALUES (?, ?, CURRENT_TIMESTAMP + (? * INTERVAL '1 millisecond'))
                ON CONFLICT (lock_key) DO UPDATE
                    SET owner_id = EXCLUDED.owner_id,
                        expires_at = EXCLUDED.expires_at
                WHERE ai_generation_leases.expires_at < CURRENT_TIMESTAMP
                """, key, ownerId, duration.toMillis());
        return updated == 1
                ? Optional.of(new Lease(key, ownerId))
                : Optional.empty();
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void release(Lease lease) {
        jdbcTemplate.update(
                "DELETE FROM ai_generation_leases WHERE lock_key = ? AND owner_id = ?",
                lease.key(), lease.ownerId());
    }
}
