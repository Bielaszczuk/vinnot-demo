package com.vinnot.wine.infrastructure.persistence.adapter;

import com.vinnot.wine.application.port.out.WineLabelScanHistoryPort;
import com.vinnot.wine.application.query.response.WineLabelScanResponse;
import com.vinnot.wine.domain.model.WineLabelScanVerdict;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** {@code wine_label_scans} (V70, V92); a scan of a wine deleted meanwhile keeps its row without the wine. */
@Component
public class JdbcWineLabelScanHistory implements WineLabelScanHistoryPort {
    private final JdbcTemplate jdbc;

    public JdbcWineLabelScanHistory(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean record(UUID scanId, UUID userId, WineLabelScanResponse.Outcome outcome, UUID wineId, String barcode,
            Instant scannedAt) {
        return jdbc.update("""
                INSERT INTO wine_label_scans(id, user_id, wine_id, outcome, barcode, scanned_at)
                SELECT ?, ?, (SELECT id FROM wines WHERE id = ?), ?, ?, ? WHERE EXISTS (SELECT 1 FROM users WHERE id = ?)
                """, scanId, userId, wineId, outcome.name(), barcode, Timestamp.from(scannedAt), userId) > 0;
    }

    @Override
    public Optional<RecordedScan> findOwnedBy(UUID scanId, UUID userId) {
        return jdbc.query("""
                SELECT id, outcome, wine_id, barcode FROM wine_label_scans WHERE id = ? AND user_id = ?
                """, (row, index) -> new RecordedScan(
                        row.getObject("id", UUID.class),
                        WineLabelScanResponse.Outcome.valueOf(row.getString("outcome")),
                        row.getObject("wine_id", UUID.class),
                        row.getString("barcode")),
                scanId, userId).stream().findFirst();
    }

    @Override
    public void saveFeedback(UUID scanId, WineLabelScanVerdict verdict, UUID wineId, Instant feedbackAt) {
        jdbc.update("""
                UPDATE wine_label_scans SET feedback = ?, feedback_wine_id = ?, feedback_at = ? WHERE id = ?
                """, verdict.name(), wineId, Timestamp.from(feedbackAt), scanId);
    }
}
