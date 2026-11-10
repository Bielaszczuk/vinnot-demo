package com.vinnot.engagement.application.port.in;

import java.time.Instant;

/** Deletes engagement ledger rows older than the retention window, in batches. */
public interface PurgeEngagementLedgerUseCase {
    int purge(Instant now);
}
