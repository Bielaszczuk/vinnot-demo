package com.vinnot.wine.infrastructure.persistence.adapter;

import com.vinnot.wine.application.port.out.WineBarcodeConfirmationPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** {@code wine_barcode_confirmations} (V92): which wine each member said a bottle barcode belongs to. */
@Component
public class JdbcWineBarcodeConfirmations implements WineBarcodeConfirmationPort {
    private final JdbcTemplate jdbc;

    public JdbcWineBarcodeConfirmations(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<UUID> findCrowdConfirmedWine(String barcode, int minimumMembers) {
        // The leading wine only: a tie for the lead has no runner-up with fewer members, so nothing is answered.
        return jdbc.queryForList("""
                WITH tallies AS (
                    SELECT c.wine_id, COUNT(DISTINCT c.user_id) AS members
                    FROM wine_barcode_confirmations c
                    JOIN wines w ON w.id = c.wine_id AND w.is_active
                    WHERE c.barcode = ?
                    GROUP BY c.wine_id
                ), ranked AS (
                    SELECT wine_id, members,
                           ROW_NUMBER() OVER (ORDER BY members DESC, wine_id) AS position,
                           LEAD(members) OVER (ORDER BY members DESC, wine_id) AS runner_up
                    FROM tallies
                )
                SELECT wine_id FROM ranked
                WHERE position = 1 AND members >= ? AND (runner_up IS NULL OR members > runner_up)
                """, UUID.class, barcode, minimumMembers).stream().findFirst();
    }

    @Override
    public void confirm(String barcode, UUID userId, UUID wineId, Instant confirmedAt) {
        jdbc.update("""
                INSERT INTO wine_barcode_confirmations(barcode, user_id, wine_id, confirmed_at) VALUES (?, ?, ?, ?)
                ON CONFLICT (barcode, user_id) DO UPDATE SET wine_id = EXCLUDED.wine_id, confirmed_at = EXCLUDED.confirmed_at
                """, barcode, userId, wineId, Timestamp.from(confirmedAt));
    }
}
