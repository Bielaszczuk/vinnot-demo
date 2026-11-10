package com.vinnot.notification.application.port.out;

import com.vinnot.notification.domain.model.NotificationCategory;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.UnaryOperator;

/** Which accounts already received which push, kept independently of the job that sends it. */
public interface PushSendLogPort {
    Set<UUID> alreadySent(String dedupeKey, Collection<UUID> userIds);

    /** Pushes counting towards the daily cap received since {@code since}, per account (absent means none). */
    Map<UUID, Integer> cappedSince(Collection<UUID> userIds, Instant since);

    /** Pushes of one category received since {@code since}, per account (absent means none). */
    Map<UUID, Integer> sentInCategorySince(Collection<UUID> userIds, NotificationCategory category, Instant since);

    /** Records the sends durably even if the calling job later fails. */
    void record(String dedupeKey, Collection<UUID> userIds, NotificationCategory category, boolean capped, Instant at);

    /**
     * Records this push for the accounts {@code choose} keeps, deciding and recording atomically per account: while
     * {@code choose} runs (it may read {@link #cappedSince} and {@link #sentInCategorySince}), concurrent calls for any of
     * these accounts wait, and afterwards they see what was recorded. So two jobs never both pass a limit.
     *
     * @return the accounts kept and recorded, in {@code choose}'s order
     */
    List<UUID> reserve(String dedupeKey, List<UUID> userIds, NotificationCategory category, boolean capped, Instant at,
            UnaryOperator<List<UUID>> choose);

    /** Forgets reserved sends that never reached the provider, so a retried job sends them. */
    void release(String dedupeKey, Collection<UUID> userIds);

    void purgeBefore(Instant before);
}
