package com.vinnot.wine.application.service;

import com.vinnot.wine.domain.model.RankedWineLabelCandidate;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class WineLabelScanPolicyTest {

    private final WineLabelScanPolicy policy = new WineLabelScanPolicy();

    @Test
    void completesLocallyOnlyForAnExactResult() {
        RankedWineLabelCandidate candidate = mock(RankedWineLabelCandidate.class);

        assertThat(policy.canCompleteWithoutVisualFallback(
                new WineLabelCatalogMatcher.MatchResult(
                        List.of(candidate), Map.of(), true)))
                .isTrue();
        assertThat(policy.canCompleteWithoutVisualFallback(
                new WineLabelCatalogMatcher.MatchResult(
                        List.of(candidate), Map.of(), false)))
                .isFalse();
    }

    @Test
    void requiresVisualFallbackWhenLocalOcrHasNoCandidate() {
        assertThat(policy.canCompleteWithoutVisualFallback(
                new WineLabelCatalogMatcher.MatchResult(
                        List.of(), Map.of(), false)))
                .isFalse();
    }

    @Test
    void keepsSuggestionConfidenceBelowTheExactMatchThreshold() {
        assertThat(policy.suggestionConfidence(1.0)).isEqualTo(0.89);
        assertThat(policy.suggestionConfidence(0.72)).isEqualTo(0.72);
        assertThat(policy.suggestionConfidence(-0.2)).isZero();
    }
}
