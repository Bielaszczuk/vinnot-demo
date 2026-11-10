package com.vinnot.ai.domain.valueobject;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNullPointerException;

class CanonicalWinePairTest {

    @Test
    void ordersIdentifiersAndReportsWhetherTheRequestWasReversed() {
        UUID lower = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID higher = UUID.fromString("00000000-0000-0000-0000-000000000002");

        CanonicalWinePair forward = CanonicalWinePair.of(lower, higher);
        CanonicalWinePair reverse = CanonicalWinePair.of(higher, lower);

        assertThat(forward.wineAId()).isEqualTo(lower);
        assertThat(forward.wineBId()).isEqualTo(higher);
        assertThat(forward.reverses(lower)).isFalse();
        assertThat(reverse).isEqualTo(forward);
        assertThat(reverse.reverses(higher)).isTrue();
    }

    @Test
    void preservesTheHistoricalTextualUuidOrder() {
        UUID textuallyLower = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID signedLower = UUID.fromString("ffffffff-ffff-ffff-ffff-ffffffffffff");

        CanonicalWinePair pair = CanonicalWinePair.of(signedLower, textuallyLower);

        assertThat(pair.wineAId()).isEqualTo(textuallyLower);
        assertThat(pair.wineBId()).isEqualTo(signedLower);
        assertThat(pair.reverses(signedLower)).isTrue();
    }

    @Test
    void rejectsMissingIdentifiers() {
        UUID wineId = UUID.randomUUID();

        assertThatNullPointerException().isThrownBy(() -> CanonicalWinePair.of(null, wineId));
        assertThatNullPointerException().isThrownBy(() -> CanonicalWinePair.of(wineId, null));
    }
}
