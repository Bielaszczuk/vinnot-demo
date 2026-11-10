package com.vinnot.ai.domain.model;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class WineComparisonTest {

    @Test
    void normalizesWinePairOrderForStableCacheIdentity() {
        UUID high = UUID.fromString("ffffffff-ffff-ffff-ffff-ffffffffffff");
        UUID low = UUID.fromString("00000000-0000-0000-0000-000000000001");

        WineComparison comparison = WineComparison.create(
                high, low, "en-US", Map.of("summary", "Original"));
        var originalUpdatedAt = comparison.getUpdatedAt();
        comparison.updateComparison(Map.of("summary", "Updated"));

        assertThat(comparison.getWineAId()).isEqualTo(low);
        assertThat(comparison.getWineBId()).isEqualTo(high);
        assertThat(comparison.getComparisonJson()).containsEntry("summary", "Updated");
        assertThat(comparison.getUpdatedAt()).isAfterOrEqualTo(originalUpdatedAt);
    }
}
