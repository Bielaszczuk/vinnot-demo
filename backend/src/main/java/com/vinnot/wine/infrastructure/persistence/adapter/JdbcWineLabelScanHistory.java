package com.vinnot.wine.infrastructure.persistence.adapter;

import com.vinnot.wine.application.port.out.WineLabelScanHistoryPort;
import com.vinnot.wine.application.query.response.WineLabelScanResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

/** {@code wine_label_scans} (V70); a scan of a wine deleted meanwhile keeps its row without the wine. */
@Component
public class JdbcWineLabelScanHistory implements WineLabelScanHistoryPort {
    private final JdbcTemplate jdbc;

    public JdbcWineLabelScanHistory(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void record(UUID userId, WineLabelScanResponse.Outcome outcome, UUID wineId, Instant scannedAt) {
        jdbc.update("""
                INSERT INTO wine_label_scans(id, user_id, wine_id, outcome, scanned_at)
                SELECT ?, ?, (SELECT id FROM wines WHERE id = ?), ?, ? WHERE EXISTS (SELECT 1 FROM users WHERE id = ?)
                """, UUID.randomUUID(), userId, wineId, outcome.name(), Timestamp.from(scannedAt), userId);
    }
}
