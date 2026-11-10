package com.vinnot.engagement.domain.model;

import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationType;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;

/**
 * Chooses at most one engagement push per account and day (#405, S10-S13). An account away for two weeks only gets
 * come-back pushes; otherwise those are left out. Candidates of a category the account turned off, of a type switched
 * off, too soon after the last of their type or past their category's own limit are dropped. Of the rotating suggestions
 * only the one whose turn it is competes ({@link #suggestionInTurn}); the best-scored candidate wins. Then the budget
 * decides, at the send time, and a second push in the same week must score high enough.
 */
public final class EngagementSelection {
    private static final Comparator<EngagementCandidate> BY_SCORE = Comparator.comparingDouble(EngagementCandidate::score);

    private EngagementSelection() {
    }

    public static EngagementDecision choose(PlanningMember member, EngagementHistory history,
            List<EngagementCandidate> candidates, Set<NotificationCategory> allowed, Set<NotificationType> switchedOff,
            EngagementPolicy policy, Instant now) {
        Optional<Instant> sendAt = SendTime.next(now, member.zone(), member.usualHour());
        if (sendAt.isEmpty()) {
            return EngagementDecision.none(EngagementDecision.Outcome.TOO_LATE);
        }
        boolean away = member.awayFor(EngagementRules.INACTIVE_AFTER, now);
        List<EngagementCandidate> eligible = candidates.stream()
                .filter(candidate -> candidate.userId().equals(member.userId()))
                .filter(candidate -> (candidate.type() == NotificationType.WINBACK) == away)
                .filter(candidate -> allowed.contains(candidate.type().category()))
                .filter(candidate -> !switchedOff.contains(candidate.type()))
                .filter(candidate -> dueAgain(history, candidate.type(), sendAt.get()))
                .filter(candidate -> withinCategoryLimit(history, candidate.type().category(), sendAt.get()))
                .toList();
        Optional<EngagementCandidate> best = Stream.concat(
                eligible.stream().filter(candidate -> !EngagementRules.of(candidate.type()).rotates()),
                suggestionInTurn(eligible.stream().filter(candidate -> EngagementRules.of(candidate.type()).rotates()).toList(),
                        history, sendAt.get()).stream())
                .max(BY_SCORE);
        if (best.isEmpty()) {
            return EngagementDecision.none(EngagementDecision.Outcome.NO_CANDIDATE);
        }
        EngagementVerdict verdict = policy.admits(best.get().type(), history, member.zone(), sendAt.get());
        if (verdict != EngagementVerdict.ALLOWED) {
            return EngagementDecision.none(refused(verdict));
        }
        if (!policy.owesWeeklyPush(history, sendAt.get()) && best.get().score() < policy.secondPushMinScore()) {
            return EngagementDecision.none(EngagementDecision.Outcome.BELOW_SCORE);
        }
        return new EngagementDecision(EngagementDecision.Outcome.PLANNED, best.get(), sendAt.get());
    }

    /**
     * The rotating suggestion whose turn it is (S13): the wine of the week once two weeks passed since the last wine
     * suggestion (an event-triggered one included); otherwise the route or winery sent least recently; and the wine of
     * the week again when neither is eligible, so the week is not left empty.
     */
    static Optional<EngagementCandidate> suggestionInTurn(List<EngagementCandidate> suggestions, EngagementHistory history,
            Instant at) {
        Optional<EngagementCandidate> wine = suggestions.stream()
                .filter(candidate -> candidate.type() == NotificationType.TASTE_PICK).max(BY_SCORE);
        boolean wineDue = Stream.of(NotificationType.TASTE_PICK, NotificationType.WINE_RECOMMENDATION)
                .flatMap(type -> history.lastOf(type).stream())
                .noneMatch(last -> last.isAfter(at.minus(EngagementRules.WINE_OF_THE_WEEK_EVERY)));
        if (wine.isPresent() && wineDue) {
            return wine;
        }
        Optional<EngagementCandidate> other = suggestions.stream()
                .filter(candidate -> candidate.type() != NotificationType.TASTE_PICK)
                .min(Comparator.comparing((EngagementCandidate candidate) -> history.lastOf(candidate.type()).orElse(Instant.MIN))
                        .thenComparing(BY_SCORE.reversed()));
        return other.isPresent() ? other : wine;
    }

    private static EngagementDecision.Outcome refused(EngagementVerdict verdict) {
        return switch (verdict) {
            case PAUSED -> EngagementDecision.Outcome.PAUSED;
            case FATIGUED -> EngagementDecision.Outcome.FATIGUED;
            default -> EngagementDecision.Outcome.OVER_BUDGET;
        };
    }

    private static boolean dueAgain(EngagementHistory history, NotificationType type, Instant at) {
        return history.lastOf(type).map(last -> !last.isAfter(at.minus(EngagementRules.of(type).cadence())))
                .orElse(true);
    }

    private static boolean withinCategoryLimit(EngagementHistory history, NotificationCategory category, Instant at) {
        return category.pushLimit()
                .map(limit -> history.countInCategorySince(category, at.minus(limit.window())) < limit.count())
                .orElse(true);
    }
}
