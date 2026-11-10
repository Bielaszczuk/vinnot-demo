package com.vinnot.activity.application.command.handler;

import com.vinnot.activity.application.port.in.PurgeExpiredActivityUseCase;
import com.vinnot.activity.application.port.out.AppOpenRepositoryPort;
import com.vinnot.activity.application.port.out.ContentViewRepositoryPort;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * Deletes signals past the retention window in short batches, each its own statement, so a large backlog never
 * holds one long transaction. Running it on several instances at once only splits the work.
 */
@Service
public class PurgeExpiredActivityCommandHandler implements PurgeExpiredActivityUseCase {
    private final ContentViewRepositoryPort views;
    private final AppOpenRepositoryPort opens;
    private final Duration retention;
    private final int batchSize;
    private final Clock clock;

    @Autowired
    public PurgeExpiredActivityCommandHandler(ContentViewRepositoryPort views, AppOpenRepositoryPort opens,
            @Value("${app.activity.retention:180d}") Duration retention,
            @Value("${app.activity.purge-batch-size:5000}") int batchSize) {
        this(views, opens, retention, batchSize, Clock.systemUTC());
    }

    PurgeExpiredActivityCommandHandler(ContentViewRepositoryPort views, AppOpenRepositoryPort opens,
            Duration retention, int batchSize, Clock clock) {
        if (retention.isNegative() || retention.isZero()) {
            throw new IllegalArgumentException("app.activity.retention must be positive");
        }
        if (batchSize < 1) {
            throw new IllegalArgumentException("app.activity.purge-batch-size must be positive");
        }
        this.views = views;
        this.opens = opens;
        this.retention = retention;
        this.batchSize = batchSize;
        this.clock = clock;
    }

    @Override
    public int execute() {
        Instant cutoff = clock.instant().minus(retention);
        return drain(cutoff, views::purgeBefore) + drain(cutoff, opens::purgeBefore)
                + drain(cutoff, opens::purgeLastActiveBefore);
    }

    private int drain(Instant cutoff, Purge purge) {
        int total = 0;
        int deleted;
        do {
            deleted = purge.before(cutoff, batchSize);
            total += deleted;
        } while (deleted == batchSize);
        return total;
    }

    @FunctionalInterface
    private interface Purge {
        int before(Instant cutoff, int batchSize);
    }
}
