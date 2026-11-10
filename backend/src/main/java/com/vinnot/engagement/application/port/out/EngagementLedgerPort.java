package com.vinnot.engagement.application.port.out;

import com.vinnot.engagement.application.model.LedgerEntry;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** The durable engagement ledger (engagement_sends). */
public interface EngagementLedgerPort {
    /** The latest {@code perAccount} rows of each account, newest first, in one query; accounts without rows are absent. */
    Map<UUID, List<LedgerEntry>> recent(Collection<UUID> userIds, int perAccount);

    /** Records rows in the caller's transaction; a repeated account and key is ignored. */
    void record(List<LedgerEntry> entries);

    void release(String dedupeKey, Collection<UUID> userIds);

    /** Deletes up to {@code batchSize} rows older than {@code before}; returns how many. */
    int purgeBefore(Instant before, int batchSize);
}
