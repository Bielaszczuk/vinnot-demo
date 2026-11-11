package com.vinnot.wine.application.port.out;

import com.vinnot.wine.application.query.response.WineLabelScanResponse;
import com.vinnot.wine.domain.model.WineLabelScanVerdict;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** The label scans of signed-in members (#455) and the feedback they give on them (#544). */
public interface WineLabelScanHistoryPort {
    /**
     * @param scanId    the identifier the member later sends feedback with
     * @param userId    who scanned
     * @param outcome   how the scan ended
     * @param wineId    the exactly matched wine, or {@code null}
     * @param barcode   the bottle barcode the member read, or {@code null}
     * @param scannedAt when it happened
     * @return whether the scan was stored (a member deleted meanwhile has none)
     */
    boolean record(UUID scanId, UUID userId, WineLabelScanResponse.Outcome outcome, UUID wineId, String barcode,
            Instant scannedAt);

    /** The scan, only when it belongs to this member. */
    Optional<RecordedScan> findOwnedBy(UUID scanId, UUID userId);

    /** Stores the member's verdict on the scan, replacing any earlier one. */
    void saveFeedback(UUID scanId, WineLabelScanVerdict verdict, UUID wineId, Instant feedbackAt);

    /**
     * @param wineId  the exactly matched wine, or {@code null} (no exact match, or the wine was deleted)
     * @param barcode the barcode read with the scan, or {@code null}
     */
    record RecordedScan(UUID id, WineLabelScanResponse.Outcome outcome, UUID wineId, String barcode) {
    }
}
