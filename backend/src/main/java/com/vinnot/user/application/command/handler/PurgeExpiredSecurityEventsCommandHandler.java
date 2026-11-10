package com.vinnot.user.application.command.handler;

import com.vinnot.user.application.port.in.PurgeExpiredSecurityEventsUseCase;
import com.vinnot.user.application.port.out.SecurityEventPort;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * Deletes security events past the retention window (#482) in short batches, each its own statement, so a backlog
 * never holds one long transaction. Same shape as the activity purge.
 */
@Service
public class PurgeExpiredSecurityEventsCommandHandler implements PurgeExpiredSecurityEventsUseCase {
    private final SecurityEventPort events;
    private final Duration retention;
    private final int batchSize;
    private final Clock clock;

    @Autowired
    public PurgeExpiredSecurityEventsCommandHandler(SecurityEventPort events,
            @Value("${app.security.events.retention:P180D}") Duration retention,
            @Value("${app.security.events.purge-batch-size:5000}") int batchSize) {
        this(events, retention, batchSize, Clock.systemUTC());
    }

    PurgeExpiredSecurityEventsCommandHandler(SecurityEventPort events, Duration retention, int batchSize, Clock clock) {
        if (retention.isNegative() || retention.isZero()) {
            throw new IllegalArgumentException("app.security.events.retention must be positive");
        }
        if (batchSize < 1) {
            throw new IllegalArgumentException("app.security.events.purge-batch-size must be positive");
        }
        this.events = events;
        this.retention = retention;
        this.batchSize = batchSize;
        this.clock = clock;
    }

    @Override
    public int execute() {
        Instant cutoff = clock.instant().minus(retention);
        int total = 0;
        int deleted;
        do {
            deleted = events.purgeBefore(cutoff, batchSize);
            total += deleted;
        } while (deleted == batchSize);
        return total;
    }
}
