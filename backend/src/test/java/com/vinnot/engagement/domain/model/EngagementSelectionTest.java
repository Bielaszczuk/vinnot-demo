package com.vinnot.engagement.domain.model;

import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.OptionalInt;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** S10-S13: at most one push per account and day, the best one the budget allows. */
class EngagementSelectionTest {
    private static final ZoneId BUENOS_AIRES = ZoneId.of("America/Argentina/Buenos_Aires");
    /** 04:00 in Buenos Aires on a Wednesday: planning time. */
    private static final Instant NOW = Instant.parse("2026-10-21T07:00:00Z");
    private static final Instant EVENING = Instant.parse("2026-10-21T22:30:00Z");
    private static final Set<NotificationCategory> ALL = EnumSet.allOf(NotificationCategory.class);
    private final UUID ana = UUID.randomUUID();
    private final EngagementPolicy policy = EngagementPolicy.standard();
    private final PlanningMember active = new PlanningMember(ana, BUENOS_AIRES, NOW.minus(Duration.ofDays(100)),
            NOW.minus(Duration.ofDays(1)), OptionalInt.empty());

    @Test
    void theBestScoredCandidateIsPlannedAtTheSendTime() {
        EngagementDecision decision = choose(active, EngagementHistory.empty(), List.of(
                candidate(NotificationType.TASTE_PICK, 0.4), candidate(NotificationType.VIEWED_NOT_RATED, 0.9),
                new EngagementCandidate(UUID.randomUUID(), NotificationType.POST_EVENT, null, Map.of(), CandidateSignals.fit(1))));

        assertThat(decision.outcome()).isEqualTo(EngagementDecision.Outcome.PLANNED);
        assertThat(decision.candidate().type()).as("another account's candidate is ignored").isEqualTo(NotificationType.VIEWED_NOT_RATED);
        assertThat(decision.sendAt()).as("19:30 on a weekday without a usual hour").isEqualTo(EVENING);
    }

    @Test
    void withoutCandidatesNothingIsPlanned() {
        assertThat(choose(active, EngagementHistory.empty(), List.of()).outcome()).isEqualTo(EngagementDecision.Outcome.NO_CANDIDATE);
    }

    @Test
    void anAccountAwayForTwoWeeksOnlyGetsComeBackPushesAndOnlyItDoes() {
        PlanningMember away = new PlanningMember(ana, BUENOS_AIRES, NOW.minus(Duration.ofDays(100)), NOW.minus(Duration.ofDays(15)),
                OptionalInt.empty());
        List<EngagementCandidate> both = List.of(candidate(NotificationType.TASTE_PICK, 1), candidate(NotificationType.WINBACK, 0.1));

        assertThat(choose(away, EngagementHistory.empty(), both).candidate().type()).isEqualTo(NotificationType.WINBACK);
        assertThat(choose(active, EngagementHistory.empty(), both).candidate().type()).isEqualTo(NotificationType.TASTE_PICK);
        assertThat(choose(away, EngagementHistory.empty(), List.of(candidate(NotificationType.TASTE_PICK, 1))).outcome())
                .isEqualTo(EngagementDecision.Outcome.NO_CANDIDATE);
    }

    @Test
    void categoriesTurnedOffAndSwitchedOffTypesAreLeftOut() {
        List<EngagementCandidate> candidates = List.of(candidate(NotificationType.TASTE_PICK, 1), candidate(NotificationType.CELLAR_CHECKIN, 0.1));
        assertThat(EngagementSelection.choose(active, EngagementHistory.empty(), candidates,
                EnumSet.of(NotificationCategory.REMINDERS), Set.of(), policy, NOW).candidate().type())
                .isEqualTo(NotificationType.CELLAR_CHECKIN);
        assertThat(EngagementSelection.choose(active, EngagementHistory.empty(), candidates, ALL,
                Set.of(NotificationType.TASTE_PICK), policy, NOW).candidate().type()).isEqualTo(NotificationType.CELLAR_CHECKIN);
    }

    @Test
    void aTypeWaitsForItsCadenceAndACategoryForItsOwnLimit() {
        EngagementHistory routeLastWeek = history(new EngagementSend(NotificationType.ROUTE_PICK, "r", null,
                NOW.minus(Duration.ofDays(10)), false, true));
        assertThat(choose(active, routeLastWeek, List.of(candidate(NotificationType.ROUTE_PICK, 1))).outcome())
                .as("routes every two to three weeks").isEqualTo(EngagementDecision.Outcome.NO_CANDIDATE);
        assertThat(choose(active, routeLastWeek, List.of(candidate(NotificationType.CELLAR_CHECKIN, 1))).outcome())
                .isEqualTo(EngagementDecision.Outcome.PLANNED);

        EngagementHistory recommendedThisWeek = history(new EngagementSend(NotificationType.WINE_RECOMMENDATION, "w", null,
                NOW.minus(Duration.ofDays(3)), false, true));
        assertThat(choose(active, recommendedThisWeek, List.of(candidate(NotificationType.WINERY_PICK, 1))).outcome())
                .as("one recommendation a week, the event-triggered one included").isEqualTo(EngagementDecision.Outcome.NO_CANDIDATE);
    }

    @Test
    void theBudgetDecidesAtTheSendTime() {
        EngagementHistory yesterday = history(opened(EVENING.minus(Duration.ofDays(1))));
        assertThat(choose(active, yesterday, List.of(candidate(NotificationType.POST_EVENT, 1))).outcome())
                .isEqualTo(EngagementDecision.Outcome.OVER_BUDGET);

        EngagementHistory fatigued = history(unopened(NOW.minus(Duration.ofDays(4))), unopened(NOW.minus(Duration.ofDays(11))),
                unopened(NOW.minus(Duration.ofDays(18))));
        assertThat(choose(active, fatigued, List.of(candidate(NotificationType.POST_EVENT, 1))).outcome())
                .isEqualTo(EngagementDecision.Outcome.FATIGUED);

        EngagementHistory paused = history(unopened(NOW.minus(Duration.ofDays(9))), unopened(NOW.minus(Duration.ofDays(16))),
                unopened(NOW.minus(Duration.ofDays(23))), unopened(NOW.minus(Duration.ofDays(30))));
        assertThat(choose(active, paused, List.of(candidate(NotificationType.POST_EVENT, 1))).outcome())
                .isEqualTo(EngagementDecision.Outcome.PAUSED);
    }

    @Test
    void theWeeklyPushIsOwedWhateverItsScoreButASecondOneMustScoreHigh() {
        EngagementCandidate weak = candidate(NotificationType.CELLAR_CHECKIN, 0);
        assertThat(weak.score()).isLessThan(policy.secondPushMinScore());
        assertThat(choose(active, EngagementHistory.empty(), List.of(weak)).outcome()).isEqualTo(EngagementDecision.Outcome.PLANNED);

        EngagementHistory oneThisWeek = history(opened(NOW.minus(Duration.ofDays(3))));
        assertThat(choose(active, oneThisWeek, List.of(weak)).outcome()).isEqualTo(EngagementDecision.Outcome.BELOW_SCORE);
        assertThat(choose(active, oneThisWeek, List.of(candidate(NotificationType.POST_EVENT, 1))).outcome())
                .isEqualTo(EngagementDecision.Outcome.PLANNED);
    }

    /** S13: the second come-back push, 30 days away, goes even though the earlier pushes were never opened. */
    @Test
    void theSecondComeBackPushIsPlannedForAnAccountWhoseEngagementIsPaused() {
        Instant lastOpen = NOW.minus(Duration.ofDays(30));
        PlanningMember away = new PlanningMember(ana, BUENOS_AIRES, NOW.minus(Duration.ofDays(100)), lastOpen, OptionalInt.empty());
        EngagementHistory unopenedSinceLeaving = new EngagementHistory(List.of(unopened(NOW.minus(Duration.ofDays(28))),
                unopened(NOW.minus(Duration.ofDays(21))),
                new EngagementSend(NotificationType.WINBACK, "w1", null, NOW.minus(Duration.ofDays(16)), false, false)), lastOpen);
        assertThat(unopenedSinceLeaving.pausedAt(EVENING, policy.pauseAfter())).isTrue();

        EngagementDecision decision = choose(away, unopenedSinceLeaving, List.of(candidate(NotificationType.WINBACK, 1)));

        assertThat(decision.outcome()).isEqualTo(EngagementDecision.Outcome.PLANNED);
        assertThat(decision.candidate().type()).isEqualTo(NotificationType.WINBACK);
    }

    /** S2/S13: a suggestion type sent recently gives way to another one the account is eligible for. */
    @Test
    void aSuggestionTypeSentLastWeekLosesToAnotherEligibleOne() {
        List<EngagementCandidate> both = List.of(candidate(NotificationType.TASTE_PICK, 1), candidate(NotificationType.ROUTE_PICK, 0));
        assertThat(choose(active, EngagementHistory.empty(), both).candidate().type()).isEqualTo(NotificationType.TASTE_PICK);

        EngagementHistory tasteLastWeek = history(new EngagementSend(NotificationType.TASTE_PICK, "t", null,
                EVENING.minus(Duration.ofDays(7)), false, true));
        EngagementDecision decision = choose(active, tasteLastWeek, both);
        assertThat(decision.candidate().type()).isEqualTo(NotificationType.ROUTE_PICK);
        assertThat(decision.candidate().score()).as("the ranking factor never changes the candidate's own score").isEqualTo(0.325);
    }

    /** S2/S13 over six weeks of daily planning: taste weekly at most, routes every two weeks at most, and both appear. */
    @Test
    void tasteAndRouteSuggestionsTakeTurnsOverSixWeeks() {
        Instant start = Instant.parse("2026-11-02T04:00:00Z");
        List<EngagementSend> sends = new ArrayList<>();
        for (int day = 0; day < 42; day++) {
            Instant now = start.plus(Duration.ofDays(day));
            Instant seen = now.minus(Duration.ofHours(10));
            PlanningMember member = new PlanningMember(ana, ZoneOffset.UTC, start.minus(Duration.ofDays(100)), seen,
                    OptionalInt.of(19));
            EngagementDecision decision = EngagementSelection.choose(member, new EngagementHistory(sends, seen),
                    List.of(candidate(NotificationType.TASTE_PICK, 1), candidate(NotificationType.ROUTE_PICK, 1)), ALL, Set.of(),
                    policy, now);
            decision.chosen().ifPresent(chosen -> sends.add(new EngagementSend(chosen.type(), "k" + dayOf(decision.sendAt(), start),
                    null, decision.sendAt(), false, true)));
        }

        List<NotificationType> sent = sends.stream().map(EngagementSend::type).toList();
        assertThat(sent).containsExactly(NotificationType.TASTE_PICK, NotificationType.ROUTE_PICK, NotificationType.TASTE_PICK,
                NotificationType.ROUTE_PICK, NotificationType.TASTE_PICK, NotificationType.ROUTE_PICK);
        assertThat(gaps(sends, NotificationType.TASTE_PICK)).allMatch(gap -> gap.compareTo(Duration.ofDays(7)) >= 0);
        assertThat(gaps(sends, NotificationType.ROUTE_PICK)).allMatch(gap -> gap.compareTo(Duration.ofDays(14)) >= 0);
    }

    /** S13 (2026-10-25): the wine of the week every two weeks; the weeks between alternate the route and the winery. */
    @Test
    void theWineOfTheWeekGoesEveryTwoWeeksAndRoutesAndWineriesTakeTheWeeksBetween() {
        List<EngagementSend> sends = simulate(56, candidate(NotificationType.TASTE_PICK, 0.3), candidate(NotificationType.ROUTE_PICK, 1),
                candidate(NotificationType.WINERY_PICK, 1));

        assertThat(sends.stream().map(EngagementSend::type).toList()).containsExactly(NotificationType.TASTE_PICK,
                NotificationType.ROUTE_PICK, NotificationType.TASTE_PICK, NotificationType.WINERY_PICK, NotificationType.TASTE_PICK,
                NotificationType.ROUTE_PICK, NotificationType.TASTE_PICK, NotificationType.WINERY_PICK);
        assertThat(gaps(sends, NotificationType.TASTE_PICK)).allMatch(gap -> gap.equals(Duration.ofDays(14)));
    }

    @Test
    void withoutARouteOrAWineryTheWineOfTheWeekStillGoesEveryWeek() {
        List<EngagementSend> sends = simulate(28, candidate(NotificationType.TASTE_PICK, 1));

        assertThat(sends).extracting(EngagementSend::type).containsOnly(NotificationType.TASTE_PICK).hasSize(4);
        assertThat(gaps(sends, NotificationType.TASTE_PICK)).allMatch(gap -> gap.equals(Duration.ofDays(7)));
    }

    @Test
    void aRecentEventWineRecommendationCountsAsTheWineOfTheseTwoWeeks() {
        EngagementHistory recommended = history(new EngagementSend(NotificationType.WINE_RECOMMENDATION, "w", null,
                EVENING.minus(Duration.ofDays(8)), false, true));
        assertThat(choose(active, recommended, List.of(candidate(NotificationType.TASTE_PICK, 1),
                candidate(NotificationType.ROUTE_PICK, 0))).candidate().type()).isEqualTo(NotificationType.ROUTE_PICK);
    }

    private List<EngagementSend> simulate(int days, EngagementCandidate... candidates) {
        Instant start = Instant.parse("2026-11-02T04:00:00Z");
        List<EngagementSend> sends = new ArrayList<>();
        for (int day = 0; day < days; day++) {
            Instant now = start.plus(Duration.ofDays(day));
            Instant seen = now.minus(Duration.ofHours(10));
            PlanningMember member = new PlanningMember(ana, ZoneOffset.UTC, start.minus(Duration.ofDays(100)), seen, OptionalInt.of(19));
            EngagementDecision decision = EngagementSelection.choose(member, new EngagementHistory(sends, seen), List.of(candidates), ALL,
                    Set.of(), policy, now);
            decision.chosen().ifPresent(chosen -> sends.add(new EngagementSend(chosen.type(), "k" + dayOf(decision.sendAt(), start),
                    null, decision.sendAt(), false, true)));
        }
        return sends;
    }

    private static long dayOf(Instant at, Instant start) {
        return Duration.between(start, at).toDays();
    }

    private static List<Duration> gaps(List<EngagementSend> sends, NotificationType type) {
        List<Instant> times = sends.stream().filter(send -> send.type() == type).map(EngagementSend::sentAt).toList();
        List<Duration> gaps = new ArrayList<>();
        for (int index = 1; index < times.size(); index++) {
            gaps.add(Duration.between(times.get(index - 1), times.get(index)));
        }
        return gaps;
    }

    @Test
    void nothingIsPlannedOnceTheDaysWindowClosed() {
        assertThat(EngagementSelection.choose(active, EngagementHistory.empty(), List.of(candidate(NotificationType.TASTE_PICK, 1)),
                ALL, Set.of(), policy, Instant.parse("2026-10-22T01:30:00Z")).outcome()).isEqualTo(EngagementDecision.Outcome.TOO_LATE);
    }

    @Test
    void aMemberWithoutLastSeenWasLastSeenWhenCreated() {
        PlanningMember created = new PlanningMember(ana, BUENOS_AIRES, NOW.minus(Duration.ofDays(20)), null, null);
        assertThat(created.lastSeenAt()).isEqualTo(created.createdAt());
        assertThat(created.usualHour()).isEmpty();
        assertThat(created.awayFor(Duration.ofDays(14), NOW)).isTrue();
    }

    private EngagementDecision choose(PlanningMember member, EngagementHistory history, List<EngagementCandidate> candidates) {
        return EngagementSelection.choose(member, history, candidates, ALL, Set.of(), policy, NOW);
    }

    private EngagementCandidate candidate(NotificationType type, double fit) {
        return new EngagementCandidate(ana, type, null, Map.of(), CandidateSignals.fit(fit));
    }

    private static EngagementHistory history(EngagementSend... sends) {
        return new EngagementHistory(List.of(sends), null);
    }

    private static EngagementSend opened(Instant at) {
        return new EngagementSend(NotificationType.TASTE_PICK, "k" + at, null, at, false, true);
    }

    private static EngagementSend unopened(Instant at) {
        return new EngagementSend(NotificationType.CELLAR_CHECKIN, "k" + at, null, at, false, false);
    }
}
