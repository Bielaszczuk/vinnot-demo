package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.application.port.out.PushMetricsPort;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushOutcome;
import com.vinnot.shared.domain.util.EnumNames;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.EnumMap;
import java.util.Map;
import java.util.Optional;

/**
 * Daily counters in {@code push_delivery_outcomes} (V59). Counts are written in their own transaction, like the send
 * log, so what was handed to the provider stays counted when a later batch of the same job fails.
 */
@Component
public class JdbcPushMetrics implements PushMetricsPort {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate ownTransaction;

    public JdbcPushMetrics(JdbcTemplate jdbc, PlatformTransactionManager transactions) {
        this.jdbc = jdbc;
        this.ownTransaction = new TransactionTemplate(transactions);
        this.ownTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Override
    public void record(NotificationType type, Map<PushOutcome, Integer> counts, Instant at) {
        var rows = counts.entrySet().stream().filter(entry -> entry.getValue() > 0)
                .map(entry -> new Object[]{Date.valueOf(at.atOffset(ZoneOffset.UTC).toLocalDate()), type.name(),
                        entry.getKey().name(), entry.getValue()})
                .toList();
        if (rows.isEmpty()) {
            return;
        }
        ownTransaction.executeWithoutResult(status -> jdbc.batchUpdate("""
                INSERT INTO push_delivery_outcomes(day, notification_type, outcome, count) VALUES (?,?,?,?)
                ON CONFLICT (day, notification_type, outcome) DO UPDATE
                SET count = push_delivery_outcomes.count + EXCLUDED.count
                """, rows));
    }

    @Override
    public Map<NotificationType, Map<PushOutcome, Long>> totalsSince(LocalDate fromDay) {
        Map<NotificationType, Map<PushOutcome, Long>> totals = new EnumMap<>(NotificationType.class);
        jdbc.query("""
                SELECT notification_type, outcome, sum(count) AS total FROM push_delivery_outcomes
                WHERE day >= ? GROUP BY notification_type, outcome
                """, (ResultSet row) -> add(totals, row), Date.valueOf(fromDay));
        return totals;
    }

    /** Rows written by a newer binary with types or outcomes this one does not know are left out. */
    private static void add(Map<NotificationType, Map<PushOutcome, Long>> totals, ResultSet row) throws SQLException {
        Optional<NotificationType> type = EnumNames.find(NotificationType.class, row.getString("notification_type"));
        Optional<PushOutcome> outcome = EnumNames.find(PushOutcome.class, row.getString("outcome"));
        if (type.isPresent() && outcome.isPresent()) {
            totals.computeIfAbsent(type.get(), ignored -> new EnumMap<>(PushOutcome.class))
                    .put(outcome.get(), row.getLong("total"));
        }
    }
}
