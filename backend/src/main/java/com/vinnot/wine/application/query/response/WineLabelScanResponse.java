package com.vinnot.wine.application.query.response;

import java.util.List;
import java.util.UUID;

/**
 * The result of one label scan. {@code scanId} identifies the recorded scan the member can send feedback on; it is
 * {@code null} when nobody is recorded for the scan or recording it failed.
 */
public record WineLabelScanResponse(
        Outcome outcome,
        double confidence,
        WineSummaryResponse wine,
        List<WineSummaryResponse> suggestions,
        List<WineLabelMatchResponse> candidates,
        ExtractedWineLabelResponse extractedData,
        UUID scanId
) {

    /** A result that is not recorded (yet). */
    public WineLabelScanResponse(
            Outcome outcome,
            double confidence,
            WineSummaryResponse wine,
            List<WineSummaryResponse> suggestions,
            List<WineLabelMatchResponse> candidates,
            ExtractedWineLabelResponse extractedData) {
        this(outcome, confidence, wine, suggestions, candidates, extractedData, null);
    }

    /** The same result, identified by its recorded scan. */
    public WineLabelScanResponse withScanId(UUID recordedScanId) {
        return new WineLabelScanResponse(
                outcome, confidence, wine, suggestions, candidates, extractedData, recordedScanId);
    }

    public enum Outcome {
        EXACT_MATCH,
        POSSIBLE_MATCHES,
        NO_MATCH
    }
}
