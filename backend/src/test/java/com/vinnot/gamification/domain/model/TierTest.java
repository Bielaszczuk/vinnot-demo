package com.vinnot.gamification.domain.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** S1: eleven tiers by current points, with their exact keys and thresholds. */
class TierTest {

    @Test
    void theLadderHasTheApprovedKeysAndThresholds() {
        assertThat(Tier.values()).extracting(Tier::name).containsExactly("BROTE", "PARRA", "RACIMO", "VENDIMIA",
                "LAGAR", "BARRICA", "CRIANZA", "RESERVA", "GRAN_RESERVA", "GRAN_ENOFILO", "VINNOT");
        assertThat(Tier.values()).extracting(Tier::threshold)
                .containsExactly(0, 30, 80, 160, 280, 450, 700, 1000, 1600, 2600, 5000);
    }

    @Test
    void pointsChooseTheHighestReachedTier() {
        assertThat(Tier.forPoints(0)).isEqualTo(Tier.BROTE);
        assertThat(Tier.forPoints(-3)).isEqualTo(Tier.BROTE);
        assertThat(Tier.forPoints(29)).isEqualTo(Tier.BROTE);
        assertThat(Tier.forPoints(30)).isEqualTo(Tier.PARRA);
        assertThat(Tier.forPoints(1599)).isEqualTo(Tier.RESERVA);
        assertThat(Tier.forPoints(1600)).isEqualTo(Tier.GRAN_RESERVA);
        assertThat(Tier.forPoints(99_999)).isEqualTo(Tier.VINNOT);
    }

    @Test
    void nextIsNullAtTheTopAndLowerPicksTheSmallerTier() {
        assertThat(Tier.BROTE.next()).isEqualTo(Tier.PARRA);
        assertThat(Tier.GRAN_ENOFILO.next()).isEqualTo(Tier.VINNOT);
        assertThat(Tier.VINNOT.next()).isNull();
        assertThat(Tier.lower(Tier.RESERVA, Tier.LAGAR)).isEqualTo(Tier.LAGAR);
        assertThat(Tier.lower(Tier.LAGAR, Tier.RESERVA)).isEqualTo(Tier.LAGAR);
        assertThat(Tier.RACIMO.isAbove(Tier.PARRA)).isTrue();
        assertThat(Tier.RACIMO.isAbove(Tier.RACIMO)).isFalse();
    }
}
