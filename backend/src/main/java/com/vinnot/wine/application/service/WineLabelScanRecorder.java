package com.vinnot.wine.application.service;

import com.vinnot.wine.application.port.out.WineContributionPointsPort;
import com.vinnot.wine.application.port.out.WineLabelScanHistoryPort;
import com.vinnot.wine.application.query.response.WineLabelScanResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Stores a member's label scan and, for an exact match, its point (#455) in one transaction, after the scan itself
 * finished (the recognition never runs inside a database transaction).
 */
@Service
@RequiredArgsConstructor
public class WineLabelScanRecorder {
    private final WineLabelScanHistoryPort history;
    private final WineContributionPointsPort points;

    @Transactional
    public void record(UUID userId, WineLabelScanResponse response) {
        UUID wineId = response.outcome() == WineLabelScanResponse.Outcome.EXACT_MATCH && Objects.nonNull(response.wine())
                ? response.wine().id() : null;
        history.record(userId, response.outcome(), wineId, Instant.now());
        if (Objects.nonNull(wineId)) {
            points.labelMatched(userId, wineId);
        }
    }
}
