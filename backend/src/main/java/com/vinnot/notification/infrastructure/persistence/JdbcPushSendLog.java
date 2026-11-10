package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.application.port.out.PushSendLogPort;
import com.vinnot.notification.domain.model.NotificationCategory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.UnaryOperator;

/**
 * {@code push_sends}. {@link #reserve} serializes concurrent decisions per account with transaction-scoped advisory
 * locks: accounts are hashed into {@value #LOCK_SLOTS} slots, so one decision takes at most that many locks however many
 * accounts it covers (Postgres keeps advisory locks in its shared lock table), and the slots are locked in order, so two
 * decisions never deadlock. Two accounts sharing a slot only wait for each other for the few milliseconds a decision takes.
 */
@Component
public class JdbcPushSendLog implements PushSendLogPort {
    static final int LOCK_SLOTS = 64;
    /** First key of the two-key advisory locks, so these never collide with other advisory locks. */
    private static final int LOCK_NAMESPACE = 405_027;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate ownTransaction;

    public JdbcPushSendLog(JdbcTemplate jdbc, PlatformTransactionManager transactions) {
        this.jdbc = jdbc;
        this.ownTransaction = new TransactionTemplate(transactions);
        this.ownTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Override
    public Set<UUID> alreadySent(String dedupeKey, Collection<UUID> userIds) {
        if (userIds.isEmpty()) {
            return Set.of();
        }
        return new HashSet<>(jdbc.queryForList("SELECT user_id FROM push_sends WHERE dedupe_key = ? AND user_id = ANY (?)",
                UUID.class, dedupeKey, userIds.toArray(UUID[]::new)));
    }

    @Override
    public Map<UUID, Integer> cappedSince(Collection<UUID> userIds, Instant since) {
        Map<UUID, Integer> counts = new HashMap<>();
        if (userIds.isEmpty()) {
            return counts;
        }
        jdbc.query("SELECT user_id, count(*) AS sends FROM push_sends WHERE capped AND sent_at > ? AND user_id = ANY (?)"
                        + " GROUP BY user_id",
                row -> {
                    counts.put(row.getObject("user_id", UUID.class), row.getInt("sends"));
                }, Timestamp.from(since), userIds.toArray(UUID[]::new));
        return counts;
    }

    @Override
    public Map<UUID, Integer> sentInCategorySince(Collection<UUID> userIds, NotificationCategory category, Instant since) {
        Map<UUID, Integer> counts = new HashMap<>();
        if (userIds.isEmpty()) {
            return counts;
        }
        jdbc.query("SELECT user_id, count(*) AS sends FROM push_sends WHERE category = ? AND sent_at > ? AND user_id = ANY (?)"
                        + " GROUP BY user_id",
                row -> {
                    counts.put(row.getObject("user_id", UUID.class), row.getInt("sends"));
                }, category.name(), Timestamp.from(since), userIds.toArray(UUID[]::new));
        return counts;
    }

    @Override
    public void record(String dedupeKey, Collection<UUID> userIds, NotificationCategory category, boolean capped, Instant at) {
        if (userIds.isEmpty()) {
            return;
        }
        ownTransaction.executeWithoutResult(status -> insert(dedupeKey, userIds, category, capped, at));
    }

    @Override
    public List<UUID> reserve(String dedupeKey, List<UUID> userIds, NotificationCategory category, boolean capped, Instant at,
            UnaryOperator<List<UUID>> choose) {
        if (userIds.isEmpty()) {
            return List.of();
        }
        return ownTransaction.execute(status -> {
            jdbc.query("""
                    SELECT pg_advisory_xact_lock(?, slots.slot) FROM (
                        SELECT DISTINCT abs(mod(hashtext(account.id::text), ?)) AS slot FROM unnest(?::uuid[]) AS account(id)
                        ORDER BY slot) AS slots
                    """, row -> { }, LOCK_NAMESPACE, LOCK_SLOTS, userIds.toArray(UUID[]::new));
            List<UUID> kept = List.copyOf(choose.apply(List.copyOf(userIds)));
            if (!kept.isEmpty()) {
                insert(dedupeKey, kept, category, capped, at);
            }
            return kept;
        });
    }

    @Override
    public void release(String dedupeKey, Collection<UUID> userIds) {
        if (userIds.isEmpty()) {
            return;
        }
        jdbc.update("DELETE FROM push_sends WHERE dedupe_key = ? AND user_id = ANY (?)", dedupeKey, userIds.toArray(UUID[]::new));
    }

    @Override
    public void purgeBefore(Instant before) {
        jdbc.update("DELETE FROM push_sends WHERE sent_at < ?", Timestamp.from(before));
    }

    private void insert(String dedupeKey, Collection<UUID> userIds, NotificationCategory category, boolean capped, Instant at) {
        jdbc.update("""
                INSERT INTO push_sends(dedupe_key, user_id, category, capped, sent_at)
                SELECT ?, sender.id, ?, ?, ? FROM unnest(?::uuid[]) AS sender(id)
                WHERE EXISTS (SELECT 1 FROM users WHERE users.id = sender.id)
                ON CONFLICT (dedupe_key, user_id) DO NOTHING
                """, dedupeKey, category.name(), capped, Timestamp.from(at), userIds.toArray(UUID[]::new));
    }
}
