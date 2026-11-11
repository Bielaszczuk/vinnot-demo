package com.vinnot.wine.application.service;

import com.vinnot.wine.application.port.out.WineBarcodeConfirmationPort;
import com.vinnot.wine.application.port.out.WineContributionPointsPort;
import com.vinnot.wine.application.port.out.WineLabelScanHistoryPort;
import com.vinnot.wine.application.query.response.WineLabelScanResponse;
import com.vinnot.wine.domain.model.WineLabelScanVerdict;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Stores a member's label scan and, for an exact match, its point (#455) in one transaction, after the scan itself
 * finished (the recognition never runs inside a database transaction). It also stores the member's feedback on a scan
 * together with the barcode confirmation it implies (#544).
 */
@Service
@RequiredArgsConstructor
public class WineLabelScanRecorder {
    private final WineLabelScanHistoryPort history;
    private final WineContributionPointsPort points;
    private final WineBarcodeConfirmationPort barcodes;

    /** Records a scan read without a barcode; see {@link #record(UUID, WineLabelScanResponse, String)}. */
    @Transactional
    public UUID record(UUID userId, WineLabelScanResponse response) {
        return record(userId, response, null);
    }

    /**
     * @return the id of the stored scan, or {@code null} when it was not stored
     */
    @Transactional
    public UUID record(UUID userId, WineLabelScanResponse response, String barcode) {
        UUID wineId = response.outcome() == WineLabelScanResponse.Outcome.EXACT_MATCH && Objects.nonNull(response.wine())
                ? response.wine().id() : null;
        UUID scanId = UUID.randomUUID();
        boolean stored = history.record(scanId, userId, response.outcome(), wineId, barcode, Instant.now());
        if (Objects.nonNull(wineId)) {
            points.labelMatched(userId, wineId);
        }
        return stored ? scanId : null;
    }

    /**
     * Records a scan answered from crowd-confirmed barcodes. No label was recognised, so it earns no point and stores
     * no barcode: feedback on it can never confirm the barcode that answered it.
     *
     * @return the id of the stored scan, or {@code null} when it was not stored
     */
    @Transactional
    public UUID recordBarcodeAnswer(UUID userId, WineLabelScanResponse response) {
        UUID wineId = Objects.nonNull(response.wine()) ? response.wine().id() : null;
        UUID scanId = UUID.randomUUID();
        return history.record(scanId, userId, response.outcome(), wineId, null, Instant.now()) ? scanId : null;
    }

    /**
     * Stores the verdict on the scan (replacing an earlier one). Only a CONFIRMED verdict, where the recognised label
     * and the member agree on the wine, confirms the barcode the scan read: a correction is the member's word alone,
     * and trusting it would let a couple of accounts bind any barcode to any wine.
     */
    @Transactional
    public void recordFeedback(
            WineLabelScanHistoryPort.RecordedScan scan, UUID userId, WineLabelScanVerdict verdict, UUID wineId) {
        Instant now = Instant.now();
        history.saveFeedback(scan.id(), verdict, wineId, now);
        if (verdict == WineLabelScanVerdict.CONFIRMED && Objects.nonNull(wineId) && Objects.nonNull(scan.barcode())) {
            barcodes.confirm(scan.barcode(), userId, wineId, now);
        }
    }
}
