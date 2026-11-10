package com.vinnot.wine.application.port.out;

import com.vinnot.wine.application.query.response.WineLabelScanResponse;

import java.time.Instant;
import java.util.UUID;

/** The label scans of signed-in members (#455); scans were not stored before. */
public interface WineLabelScanHistoryPort {
    /**
     * @param userId    who scanned
     * @param outcome   how the scan ended
     * @param wineId    the exactly matched wine, or {@code null}
     * @param scannedAt when it happened
     */
    void record(UUID userId, WineLabelScanResponse.Outcome outcome, UUID wineId, Instant scannedAt);
}
