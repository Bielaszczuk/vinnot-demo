package com.vinnot.engagement.application.service;

import com.vinnot.engagement.application.port.in.PurgeEngagementLedgerUseCase;
import com.vinnot.engagement.application.port.out.EngagementLedgerPort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

/** Keeps the engagement ledger to its retention window (a year by default), deleting in batches. */
@Service
public class EngagementLedgerRetentionService implements PurgeEngagementLedgerUseCase {
    static final int BATCH_SIZE = 5000;
    /** The pause rule looks back four weeks; a shorter retention would forget why an account is paused. */
    static final Duration MINIMUM_RETENTION = Duration.ofDays(35);
    private final EngagementLedgerPort ledger;
    private final Duration retention;

    public EngagementLedgerRetentionService(EngagementLedgerPort ledger,
            @Value("${app.engagement.ledger-retention:365d}") Duration retention) {
        if (retention.compareTo(MINIMUM_RETENTION) < 0) {
            throw new IllegalArgumentException("app.engagement.ledger-retention must keep at least 35 days");
        }
        this.ledger = ledger;
        this.retention = retention;
    }

    @Override
    public int purge(Instant now) {
        Instant before = now.minus(retention);
        int total = 0;
        int deleted;
        do {
            deleted = ledger.purgeBefore(before, BATCH_SIZE);
            total += deleted;
        } while (deleted == BATCH_SIZE);
        return total;
    }
}
