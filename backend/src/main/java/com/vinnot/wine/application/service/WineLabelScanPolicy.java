package com.vinnot.wine.application.service;

/**
 * Decides when on-device OCR plus catalog evidence is sufficient to finish a scan.
 */
public class WineLabelScanPolicy {

    private static final double MAX_SUGGESTION_CONFIDENCE = 0.89;

    public boolean canCompleteWithoutVisualFallback(
            WineLabelCatalogMatcher.MatchResult match) {
        return match.exact();
    }

    /**
     * A candidate that was not accepted as an exact match must never be
     * presented with exact-match confidence. The raw score remains available
     * to the matcher for ranking; this value is the calibrated API confidence.
     */
    public double suggestionConfidence(double rawScore) {
        return Math.min(Math.max(rawScore, 0.0), MAX_SUGGESTION_CONFIDENCE);
    }
}
