package com.vinnot.wine.application.query.response;

import java.util.List;

public record WineLabelScanResponse(
        Outcome outcome,
        double confidence,
        WineSummaryResponse wine,
        List<WineSummaryResponse> suggestions,
        List<WineLabelMatchResponse> candidates,
        ExtractedWineLabelResponse extractedData
) {

    public enum Outcome {
        EXACT_MATCH,
        POSSIBLE_MATCHES,
        NO_MATCH
    }
}
