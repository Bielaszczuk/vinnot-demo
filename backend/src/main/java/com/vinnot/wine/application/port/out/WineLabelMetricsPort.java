package com.vinnot.wine.application.port.out;

import com.vinnot.wine.application.query.response.WineLabelScanResponse;
import com.vinnot.wine.domain.model.WineSubmissionStatus;

import java.time.Duration;

public interface WineLabelMetricsPort {

    void recordScan(
            WineLabelScanResponse.Outcome outcome, Duration duration,
            boolean visualFallbackUsed);

    void recordScanStage(ScanStage stage, Duration duration, boolean successful);

    void recordSubmission(WineSubmissionStatus status, Duration duration);

    enum ScanStage {
        LOCAL_CATALOG,
        VISUAL_RECOGNITION,
        VISUAL_WAIT,
        ENRICHED_CATALOG,
        CANDIDATE_VERIFICATION
    }
}
