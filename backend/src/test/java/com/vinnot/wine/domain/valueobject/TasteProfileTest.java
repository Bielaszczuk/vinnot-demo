package com.vinnot.wine.domain.valueobject;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TasteProfileTest {

    @Test
    void acceptsBoundaryScoresAndTreatsAllNullAsAbsent() {
        TasteProfile profile = TasteProfile.of(0, 100, 50, null);

        assertThat(profile.getAcidity()).isZero();
        assertThat(profile.getTannin()).isEqualTo(100);
        assertThat(profile.getBody()).isEqualTo(50);
        assertThat(TasteProfile.of(null, null, null, null)).isNull();
    }

    @Test
    void rejectsScoresOutsideDomainRange() {
        assertThatThrownBy(() -> TasteProfile.of(101, null, null, null))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("INVALID_TASTE_SCORE");
    }
}
