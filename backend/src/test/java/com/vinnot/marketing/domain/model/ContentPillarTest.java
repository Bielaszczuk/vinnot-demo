package com.vinnot.marketing.domain.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * #510 S8: a pillar auto-approves only when the admin turned it on; the rest of the pillar stays as it was. S13: a pillar
 * is active (planned) unless the admin switched it off.
 */
class ContentPillarTest {

    @Test
    void aPillarAutoApprovesOnlyWhenTurnedOn() {
        assertThat(new ContentPillar("CURIOUS_FACT", "Dato", "Fact", 2, "b", "b", 2, true).autoApprove()).isTrue();
        assertThat(new ContentPillar("CURIOUS_FACT", "Dato", "Fact", 2, "b", "b", 2, false).autoApprove()).isFalse();
        assertThat(new ContentPillar("CURIOUS_FACT", "Dato", "Fact", 2, "b", "b", 2).autoApprove()).as("off by default").isFalse();
    }

    @Test
    void theWeightAndTheRotationRulesStay() {
        assertThatThrownBy(() -> new ContentPillar("X", "x", "x", 0, "b", "b", 1, true)).isInstanceOf(IllegalArgumentException.class);
        assertThat(new ContentPillar(ContentPillar.WINE_DAY, "Día", "Day", 3, "b", "b", 1, true).rotates()).isFalse();
        assertThat(new ContentPillar(ContentPillar.APP_FEATURE, "App", "App", 1, "b", "b", 9, false).rotates()).isTrue();
    }

    @Test
    void aPillarIsActiveUnlessSwitchedOff() {
        assertThat(new ContentPillar("HUMOR", "Humor", "Humor", 1, "b", "b", 8, false, false).active()).isFalse();
        assertThat(new ContentPillar("HUMOR", "Humor", "Humor", 1, "b", "b", 8, true, true).active()).isTrue();
        assertThat(new ContentPillar("HUMOR", "Humor", "Humor", 1, "b", "b", 8, true).active()).as("active by default").isTrue();
        assertThat(new ContentPillar("HUMOR", "Humor", "Humor", 1, "b", "b", 8).active()).as("active by default").isTrue();
    }
}
