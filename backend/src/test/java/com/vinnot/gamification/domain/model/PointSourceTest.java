package com.vinnot.gamification.domain.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** S2: points per action, each source's daily limit first and then the 40-point global cap. */
class PointSourceTest {

    @Test
    void everySourceGrantsItsApprovedPoints() {
        assertThat(PointSource.REVIEW.points()).isEqualTo(3);
        assertThat(PointSource.REVIEW_NOTE.points()).isEqualTo(2);
        assertThat(PointSource.LIKE_RECEIVED.points()).isEqualTo(1);
        assertThat(PointSource.COMMENT.points()).isEqualTo(1);
        assertThat(PointSource.WINE_APPROVED.points()).isEqualTo(8);
        assertThat(PointSource.SCAN_MATCH.points()).isEqualTo(1);
        assertThat(PointSource.CELLAR_ADD.points()).isEqualTo(1);
        assertThat(PointSource.EVENT_REGISTRATION.points()).isEqualTo(4);
        assertThat(PointSource.PROFILE_COMPLETE.points()).isEqualTo(5);
        for (PointSource source : PointSource.values()) {
            assertThat(source.grant(DailyEarnings.NONE)).as(source.name()).isEqualTo(source.points());
        }
    }

    @Test
    void perSourceDailyLimitsStopAtFiveLikesAndThreeCommentsScansAndCellarAdds() {
        assertThat(PointSource.LIKE_RECEIVED.grant(new DailyEarnings(4, 4))).isEqualTo(1);
        assertThat(PointSource.LIKE_RECEIVED.grant(new DailyEarnings(5, 5))).isZero();
        assertThat(PointSource.COMMENT.grant(new DailyEarnings(2, 2))).isEqualTo(1);
        assertThat(PointSource.COMMENT.grant(new DailyEarnings(3, 3))).isZero();
        assertThat(PointSource.SCAN_MATCH.grant(new DailyEarnings(3, 3))).isZero();
        assertThat(PointSource.CELLAR_ADD.grant(new DailyEarnings(3, 3))).isZero();
        assertThat(PointSource.REVIEW.grant(new DailyEarnings(30, 30))).isEqualTo(3);
    }

    @Test
    void theGlobalCapClampsTheLastAwardAndExcludesApprovedWines() {
        assertThat(PointSource.REVIEW.grant(new DailyEarnings(0, 38))).isEqualTo(2);
        assertThat(PointSource.EVENT_REGISTRATION.grant(new DailyEarnings(0, 40))).isZero();
        assertThat(PointSource.LIKE_RECEIVED.grant(new DailyEarnings(0, 40))).isZero();
        assertThat(PointSource.WINE_APPROVED.grant(new DailyEarnings(16, 40))).isEqualTo(8);
        assertThat(PointSource.WINE_APPROVED.countsTowardDailyCap()).isFalse();
        assertThat(PointSource.REVIEW.countsTowardDailyCap()).isTrue();
    }
}
