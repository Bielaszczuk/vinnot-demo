package com.vinnot.ai.infrastructure.persistence.adapter;

import com.vinnot.ai.application.port.out.AiSpendingLedgerPort;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Comparator;
import java.util.Optional;
import java.util.UUID;

/** Atomic reservations across replicas; financial amounts are never floating point. */
@Component
@RequiredArgsConstructor
public class PostgresAiSpendingLedgerAdapter implements AiSpendingLedgerPort {

    private static final int MONEY_SCALE = 8;
    private final JdbcTemplate jdbc;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public UUID reserve(String model, BigDecimal maximumCostUsd, List<Window> windows) {
        BigDecimal maximum = maximumCostUsd.setScale(MONEY_SCALE, RoundingMode.CEILING);
        if (maximum.signum() <= 0 || windows.isEmpty()) {
            throw new IllegalArgumentException("A positive reservation and budget window are required");
        }
        // Deterministic lock order avoids deadlocks across overlapping daily/monthly limits.
        List<Window> ordered = windows.stream().sorted(Comparator.comparing(Window::key)).toList();
        for (Window window : ordered) {
            jdbc.update("INSERT INTO ai_spending_windows (window_key) VALUES (?) ON CONFLICT DO NOTHING", window.key());
            int accepted = jdbc.update("""
                    UPDATE ai_spending_windows SET reserved_usd = reserved_usd + ?
                    WHERE window_key = ? AND spent_usd + reserved_usd + ? <= ?
                    """, maximum, window.key(), maximum, window.limitUsd());
            if (accepted != 1) {
                // Runtime exception rolls back every window, including a previously reserved one.
                throw new BudgetExceededException();
            }
        }
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO ai_spending_reservations (id, model, maximum_usd) VALUES (?, ?, ?)",
                id, model, maximum);
        for (Window window : ordered) {
            jdbc.update("INSERT INTO ai_spending_reservation_windows (reservation_id, window_key) VALUES (?, ?)",
                    id, window.key());
        }
        return id;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void complete(UUID reservationId, Optional<BigDecimal> observedCostUsd) {
        var reservation = jdbc.queryForMap("""
                SELECT maximum_usd, outcome FROM ai_spending_reservations WHERE id = ? FOR UPDATE
                """, reservationId);
        if ("ACCOUNTED".equals(reservation.get("outcome"))) {
            return;
        }
        if (observedCostUsd.isEmpty()) {
            jdbc.update("""
                    UPDATE ai_spending_reservations SET outcome = 'UNKNOWN', completed_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """, reservationId);
            return;
        }
        BigDecimal actual = observedCostUsd.get().setScale(MONEY_SCALE, RoundingMode.CEILING);
        if (actual.signum() < 0) {
            throw new IllegalArgumentException("Observed cost cannot be negative");
        }
        BigDecimal maximum = (BigDecimal) reservation.get("maximum_usd");
        List<String> windows = jdbc.queryForList("""
                SELECT window_key FROM ai_spending_reservation_windows
                WHERE reservation_id = ? ORDER BY window_key
                """, String.class, reservationId);
        for (String key : windows) {
            jdbc.update("""
                    UPDATE ai_spending_windows SET reserved_usd = reserved_usd - ?, spent_usd = spent_usd + ?
                    WHERE window_key = ?
                    """, maximum, actual, key);
        }
        jdbc.update("""
                UPDATE ai_spending_reservations SET outcome = 'ACCOUNTED', observed_usd = ?, completed_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """, actual, reservationId);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal committedUsd(String windowKey) {
        return jdbc.queryForObject("""
                SELECT COALESCE(SUM(spent_usd + reserved_usd), 0) FROM ai_spending_windows WHERE window_key = ?
                """, BigDecimal.class, windowKey);
    }
}
