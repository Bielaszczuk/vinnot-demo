package com.vinnot.notification.infrastructure.persistence;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;

/**
 * Deletes push opens past their retention (180 days by default) once a day, in short batches so a backlog never
 * holds one long transaction (#405). Running on several instances at once only splits the work.
 */
@Component
public class JdbcPushOpenRetention {
    private static final Logger LOGGER = LoggerFactory.getLogger(JdbcPushOpenRetention.class);
    private final JdbcTemplate jdbc;
    private final Duration retention;
    private final int batchSize;
    private final Clock clock;

    @Autowired
    public JdbcPushOpenRetention(JdbcTemplate jdbc,
            @Value("${app.activity.push-open-retention:180d}") Duration retention,
            @Value("${app.activity.purge-batch-size:5000}") int batchSize) {
        this(jdbc, retention, batchSize, Clock.systemUTC());
    }

    JdbcPushOpenRetention(JdbcTemplate jdbc, Duration retention, int batchSize, Clock clock) {
        if (retention.isNegative() || retention.isZero()) {
            throw new IllegalArgumentException("app.activity.push-open-retention must be positive");
        }
        if (batchSize < 1) {
            throw new IllegalArgumentException("app.activity.purge-batch-size must be positive");
        }
        this.jdbc = jdbc;
        this.retention = retention;
        this.batchSize = batchSize;
        this.clock = clock;
    }

    @Scheduled(initialDelayString = "${app.activity.retention-initial-delay-ms:600000}",
            fixedDelayString = "${app.activity.retention-delay-ms:86400000}")
    public int purgeExpired() {
        Timestamp cutoff = Timestamp.from(clock.instant().minus(retention));
        int total = 0;
        int deleted;
        do {
            deleted = jdbc.update("""
                    DELETE FROM push_opens WHERE ctid IN (SELECT ctid FROM push_opens WHERE opened_at < ? LIMIT ?)
                    """, cutoff, batchSize);
            total += deleted;
        } while (deleted == batchSize);
        if (total > 0) {
            LOGGER.info("Deleted {} push open(s) past retention", total);
        }
        return total;
    }
}
