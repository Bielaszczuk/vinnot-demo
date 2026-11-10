package com.vinnot.engagement.infrastructure.persistence;

import com.vinnot.engagement.application.port.out.PlannerLeasePort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;

/**
 * The planner lease row (V67). Taking it is one conditional update, atomic in Postgres, so of two instances that try
 * at once exactly one gets it; an instance that dies keeps it only until it expires. No session-level lock is held, so
 * the connection pool is never pinned for the length of a run.
 */
@Component
public class JdbcPlannerLease implements PlannerLeasePort {
    static final String NAME = "planner";
    private final JdbcTemplate jdbc;

    public JdbcPlannerLease(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean acquire(String holder, Instant now, Duration lease) {
        return jdbc.update("""
                UPDATE engagement_planner_lease SET holder = ?, lease_until = ?
                WHERE name = ? AND (lease_until <= ? OR holder = ?)
                """, holder, Timestamp.from(now.plus(lease)), NAME, Timestamp.from(now), holder) == 1;
    }

    @Override
    public void release(String holder, Instant now) {
        jdbc.update("UPDATE engagement_planner_lease SET holder = NULL, lease_until = ? WHERE name = ? AND holder = ?",
                Timestamp.from(now), NAME, holder);
    }
}
