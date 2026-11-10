package com.vinnot.gamification.domain.model;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.ZoneId;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** S1 and S3: the tier follows the points, a celebration happens once per tier. */
class PointsAccountTest {
    private static final ZoneId MADRID = ZoneId.of("Europe/Madrid");

    @Test
    void reachingATierForTheFirstTimeIsReportedOnce() {
        PointsAccount account = PointsAccount.fresh(UUID.randomUUID(), MADRID);

        assertThat(account.add(29)).isEmpty();
        assertThat(account.add(1)).contains(Tier.PARRA);
        assertThat(account.tier()).isEqualTo(Tier.PARRA);
        assertThat(account.pendingCelebration()).isEqualTo(Tier.PARRA);

        account.remove(5);
        assertThat(account.tier()).isEqualTo(Tier.BROTE);
        assertThat(account.highestReached()).isEqualTo(Tier.PARRA);
        assertThat(account.add(5)).as("the tier was already reached").isEmpty();
        assertThat(account.points()).isEqualTo(30);
    }

    @Test
    void aJumpOverSeveralTiersReportsTheHighestOne() {
        PointsAccount account = PointsAccount.fresh(UUID.randomUUID(), MADRID);

        assertThat(account.add(170)).contains(Tier.VENDIMIA);
        assertThat(account.pendingCelebration()).isEqualTo(Tier.VENDIMIA);
    }

    @Test
    void celebratingMarksThatTierAndLowerOnesButNeverAboveTheHighestReached() {
        PointsAccount account = new PointsAccount(UUID.randomUUID(), MADRID, 300, Tier.LAGAR, Tier.PARRA, true);

        account.celebrate(Tier.RACIMO);
        assertThat(account.highestCelebrated()).isEqualTo(Tier.RACIMO);
        assertThat(account.pendingCelebration()).isEqualTo(Tier.LAGAR);

        account.celebrate(Tier.VINNOT);
        assertThat(account.highestCelebrated()).isEqualTo(Tier.LAGAR);
        assertThat(account.pendingCelebration()).isNull();

        account.celebrate(Tier.BROTE);
        assertThat(account.highestCelebrated()).as("a lower tier never undoes a celebration").isEqualTo(Tier.LAGAR);
    }

    @Test
    void theWelcomeCardIsDismissedOnceAndPointsNeverGoNegative() {
        PointsAccount account = new PointsAccount(UUID.randomUUID(), MADRID, 10, Tier.BROTE, Tier.BROTE, false);

        account.dismissWelcome();
        account.remove(25);

        assertThat(account.welcomeSeen()).isTrue();
        assertThat(account.points()).isZero();
        assertThat(new PointsAccount(UUID.randomUUID(), MADRID, -4, Tier.BROTE, Tier.BROTE, true).points()).isZero();
        assertThatThrownBy(() -> account.add(-1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> account.remove(-1)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void theDayStartsAtMidnightInTheMembersOwnZone() {
        PointsAccount account = PointsAccount.fresh(UUID.randomUUID(), MADRID);

        assertThat(account.dayStart(Instant.parse("2026-10-27T23:30:00Z"))).isEqualTo(Instant.parse("2026-10-27T23:00:00Z"));
        assertThat(account.dayStart(Instant.parse("2026-10-27T22:59:00Z"))).isEqualTo(Instant.parse("2026-10-26T23:00:00Z"));
        assertThat(account.zone()).isEqualTo(MADRID);
    }
}
