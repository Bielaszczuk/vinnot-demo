package com.vinnot.engagement.domain.model;

import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** S10 and S12: the engagement budget, fatigue and pause rules. */
class EngagementPolicyTest {
    private static final ZoneId BUENOS_AIRES = ZoneId.of("America/Argentina/Buenos_Aires");
    /** Wednesday 19:30 in Buenos Aires. */
    private static final Instant NOW = Instant.parse("2026-10-21T22:30:00Z");
    private final EngagementPolicy policy = EngagementPolicy.standard();

    @Test
    void aFreshAccountMayGetOneAndIsOwedTheWeeklyMinimum() {
        assertThat(policy.admits(NotificationType.TASTE_PICK, EngagementHistory.empty(), BUENOS_AIRES, NOW)).isEqualTo(EngagementVerdict.ALLOWED);
        assertThat(policy.owesWeeklyPush(EngagementHistory.empty(), NOW)).isTrue();
    }

    @Test
    void atMostTwoInAnyRollingSevenDays() {
        EngagementHistory two = history(opened(NOW.minus(Duration.ofDays(6))), opened(NOW.minus(Duration.ofDays(3))));
        assertThat(policy.admits(NotificationType.TASTE_PICK, two, BUENOS_AIRES, NOW)).isEqualTo(EngagementVerdict.OVER_BUDGET);
        assertThat(policy.owesWeeklyPush(two, NOW)).isFalse();

        EngagementHistory oneLeftTheWindow = history(opened(NOW.minus(Duration.ofDays(7))), opened(NOW.minus(Duration.ofDays(3))));
        assertThat(policy.admits(NotificationType.TASTE_PICK, oneLeftTheWindow, BUENOS_AIRES, NOW)).isEqualTo(EngagementVerdict.ALLOWED);
    }

    @Test
    void atMostOnePerLocalCalendarDayInTheAccountsTimeZone() {
        Instant tokyoMorning = Instant.parse("2026-10-21T00:30:00Z");
        Instant tokyoEvening = Instant.parse("2026-10-21T11:00:00Z");
        ZoneId tokyo = ZoneId.of("Asia/Tokyo");
        EngagementPolicy noGap = new EngagementPolicy(2, 1, Duration.ZERO, 3, 1, Duration.ofDays(28), 0.6);

        assertThat(noGap.admits(NotificationType.TASTE_PICK, history(opened(tokyoMorning)), tokyo, tokyoEvening)).isEqualTo(EngagementVerdict.OVER_BUDGET);
        // The same instants fall on two local days in Buenos Aires (20 Oct 21:30 and 21 Oct 08:00).
        assertThat(noGap.admits(NotificationType.TASTE_PICK, history(opened(tokyoMorning)), BUENOS_AIRES, tokyoEvening)).isEqualTo(EngagementVerdict.ALLOWED);
    }

    @Test
    void atLeastFortyEightHoursBetweenTwo() {
        assertThat(policy.admits(NotificationType.TASTE_PICK, history(opened(NOW.minus(Duration.ofHours(47)))), BUENOS_AIRES, NOW))
                .isEqualTo(EngagementVerdict.OVER_BUDGET);
        assertThat(policy.admits(NotificationType.TASTE_PICK, history(opened(NOW.minus(Duration.ofHours(48)))), BUENOS_AIRES, NOW))
                .isEqualTo(EngagementVerdict.ALLOWED);
        assertThat(policy.admits(NotificationType.TASTE_PICK, history(opened(NOW.plus(Duration.ofHours(30)))), BUENOS_AIRES, NOW))
                .as("a push already planned later counts too").isEqualTo(EngagementVerdict.OVER_BUDGET);
    }

    @Test
    void heldOutPushesCountTowardTheBudgetSoTheHoldoutFollowsTheSameRhythm() {
        EngagementHistory held = history(held(NOW.minus(Duration.ofDays(5))), held(NOW.minus(Duration.ofDays(3))));
        assertThat(policy.admits(NotificationType.TASTE_PICK, held, BUENOS_AIRES, NOW)).isEqualTo(EngagementVerdict.OVER_BUDGET);
    }

    @Test
    void threeUnopenedInARowDropTheAccountToOneAWeek() {
        Instant now = NOW;
        EngagementHistory fatigued = history(unopened(now.minus(Duration.ofDays(4))), unopened(now.minus(Duration.ofDays(10))),
                unopened(now.minus(Duration.ofDays(14))));
        assertThat(fatigued.unopenedStreak()).isEqualTo(3);
        assertThat(policy.admits(NotificationType.TASTE_PICK, fatigued, BUENOS_AIRES, now)).isEqualTo(EngagementVerdict.FATIGUED);
        assertThat(policy.admits(NotificationType.TASTE_PICK, fatigued, BUENOS_AIRES, now.plus(Duration.ofDays(3)))).as("a week after the last one")
                .isEqualTo(EngagementVerdict.ALLOWED);

        EngagementHistory twoUnopened = history(unopened(now.minus(Duration.ofDays(4))), unopened(now.minus(Duration.ofDays(10))),
                opened(now.minus(Duration.ofDays(14))));
        assertThat(policy.admits(NotificationType.TASTE_PICK, twoUnopened, BUENOS_AIRES, now)).isEqualTo(EngagementVerdict.ALLOWED);
    }

    @Test
    void aHeldOutRowNeverBreaksNorExtendsAnUnopenedStreak() {
        EngagementHistory streak = history(held(NOW.minus(Duration.ofDays(1))), unopened(NOW.minus(Duration.ofDays(4))),
                opened(NOW.minus(Duration.ofDays(8))));
        assertThat(streak.unopenedStreak()).isEqualTo(1);
    }

    @Test
    void fourWeeksOfPushesWithoutAnyOpenPauseEngagementUntilTheNextAppOpen() {
        List<EngagementSend> sends = new ArrayList<>();
        for (int week = 1; week <= 5; week++) {
            sends.add(unopened(NOW.minus(Duration.ofDays(7L * week))));
        }
        EngagementHistory neverOpened = new EngagementHistory(sends, NOW.minus(Duration.ofDays(60)));
        assertThat(neverOpened.pausedAt(NOW, Duration.ofDays(28))).isTrue();
        assertThat(policy.admits(NotificationType.TASTE_PICK, neverOpened, BUENOS_AIRES, NOW)).isEqualTo(EngagementVerdict.PAUSED);

        EngagementHistory cameBack = new EngagementHistory(sends, NOW.minus(Duration.ofDays(1)));
        assertThat(cameBack.pausedAt(NOW, Duration.ofDays(28))).as("an app open after the pause began resumes it").isFalse();

        EngagementHistory openedDuringTheStreak = new EngagementHistory(sends, NOW.minus(Duration.ofDays(20)));
        assertThat(openedDuringTheStreak.pausedAt(NOW, Duration.ofDays(28))).as("the open came before the pause began").isTrue();

        EngagementHistory threeWeeks = new EngagementHistory(sends.subList(0, 3), null);
        assertThat(threeWeeks.pausedAt(NOW, Duration.ofDays(28))).isFalse();
    }

    /** S13: 14 days away the first come-back push, 30 days away the second; the long pause must not silence it. */
    @Test
    void comeBackPushesIgnoreTheLongPauseButStillFollowTheBudget() {
        Instant lastOpen = NOW.minus(Duration.ofDays(30));
        List<EngagementSend> sends = List.of(unopened(lastOpen.plus(Duration.ofDays(2))), unopened(lastOpen.plus(Duration.ofDays(9))),
                new EngagementSend(NotificationType.WINBACK, "w1", null, lastOpen.plus(Duration.ofDays(14)), false, false));
        EngagementHistory away = new EngagementHistory(sends, lastOpen);

        assertThat(policy.admits(NotificationType.TASTE_PICK, away, BUENOS_AIRES, NOW)).isEqualTo(EngagementVerdict.PAUSED);
        assertThat(policy.admits(NotificationType.WINBACK, away, BUENOS_AIRES, NOW)).isEqualTo(EngagementVerdict.ALLOWED);

        List<EngagementSend> withYesterday = new ArrayList<>(sends);
        withYesterday.add(unopened(NOW.minus(Duration.ofDays(1))));
        assertThat(policy.admits(NotificationType.WINBACK, new EngagementHistory(withYesterday, lastOpen), BUENOS_AIRES, NOW))
                .as("the reduced weekly budget of an account that stopped opening them still applies")
                .isEqualTo(EngagementVerdict.FATIGUED);
        List<EngagementSend> openedYesterday = new ArrayList<>(sends);
        openedYesterday.add(opened(NOW.minus(Duration.ofDays(1))));
        assertThat(policy.admits(NotificationType.WINBACK, new EngagementHistory(openedYesterday, lastOpen), BUENOS_AIRES, NOW))
                .as("the gap and the daily limit still apply").isEqualTo(EngagementVerdict.OVER_BUDGET);
    }

    @Test
    void afterComingBackTheFourWeeksCountAgainFromThatOpen() {
        Instant back = NOW.minus(Duration.ofDays(40));
        List<EngagementSend> sends = new ArrayList<>(List.of(unopened(NOW.minus(Duration.ofDays(80))),
                unopened(NOW.minus(Duration.ofDays(70)))));
        sends.add(unopened(NOW.minus(Duration.ofDays(35))));
        sends.add(unopened(NOW.minus(Duration.ofDays(20))));
        assertThat(new EngagementHistory(sends, back).pausedAt(NOW, Duration.ofDays(28))).isTrue();
        assertThat(new EngagementHistory(sends, back).pausedAt(NOW.minus(Duration.ofDays(10)), Duration.ofDays(28))).isFalse();
        assertThat(new EngagementHistory(sends.subList(0, 2), back).pausedAt(NOW, Duration.ofDays(28)))
                .as("no push since coming back").isFalse();
    }

    @Test
    void anOpenedPushResetsThePause() {
        EngagementHistory history = history(unopened(NOW.minus(Duration.ofDays(3))), opened(NOW.minus(Duration.ofDays(10))),
                unopened(NOW.minus(Duration.ofDays(50))));
        assertThat(history.pausedAt(NOW, Duration.ofDays(28))).isFalse();
    }

    @Test
    void historyCountsPerTypeAndCategory() {
        EngagementHistory history = history(new EngagementSend(NotificationType.ROUTE_PICK, "r", "ROUTE:1", NOW.minus(Duration.ofDays(2)),
                false, false), opened(NOW.minus(Duration.ofDays(9))));
        assertThat(history.lastOf(NotificationType.ROUTE_PICK)).contains(NOW.minus(Duration.ofDays(2)));
        assertThat(history.lastOf(NotificationType.WINBACK)).isEmpty();
        assertThat(history.countOfTypeSince(NotificationType.TASTE_PICK, NOW.minus(Duration.ofDays(10)))).isEqualTo(1);
        assertThat(history.countInCategorySince(NotificationType.TASTE_PICK.category(), NOW.minus(Duration.ofDays(10)))).isEqualTo(2);
        assertThat(new EngagementHistory(null, null).sends()).isEmpty();
    }

    @Test
    void invalidPoliciesAreRefused() {
        assertThatThrownBy(() -> new EngagementPolicy(0, 1, Duration.ZERO, 3, 1, Duration.ofDays(28), 0.6))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementPolicy(2, 0, Duration.ZERO, 3, 1, Duration.ofDays(28), 0.6))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementPolicy(2, 1, Duration.ofHours(-1), 3, 1, Duration.ofDays(28), 0.6))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementPolicy(2, 1, Duration.ZERO, 0, 1, Duration.ofDays(28), 0.6))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementPolicy(2, 1, Duration.ZERO, 3, 3, Duration.ofDays(28), 0.6))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementPolicy(2, 1, Duration.ZERO, 3, 0, Duration.ofDays(28), 0.6))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementPolicy(2, 1, Duration.ZERO, 3, 1, Duration.ZERO, 0.6))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementPolicy(2, 1, Duration.ZERO, 3, 1, Duration.ofDays(28), -0.1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EngagementPolicy(2, 1, Duration.ZERO, 3, 1, Duration.ofDays(28), 1.1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static EngagementHistory history(EngagementSend... sends) {
        return new EngagementHistory(List.of(sends), null);
    }

    private static EngagementSend opened(Instant at) {
        return new EngagementSend(NotificationType.TASTE_PICK, "k" + at, null, at, false, true);
    }

    private static EngagementSend unopened(Instant at) {
        return new EngagementSend(NotificationType.TASTE_PICK, "k" + at, null, at, false, false);
    }

    private static EngagementSend held(Instant at) {
        return new EngagementSend(NotificationType.TASTE_PICK, "k" + at, null, at, true, false);
    }
}
