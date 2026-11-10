package com.vinnot.engagement.domain.model;

import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationType;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * An account's recent engagement pushes, newest first, and when it last opened the app (null when never seen).
 * Budget counts include holdout rows, so the measurement group follows the same rhythm; fatigue only looks at pushes
 * that were actually sent.
 */
public record EngagementHistory(List<EngagementSend> sends, Instant lastActiveAt) {
    public EngagementHistory {
        sends = Objects.requireNonNullElse(sends, List.<EngagementSend>of()).stream()
                .sorted(Comparator.comparing(EngagementSend::sentAt).reversed()).toList();
    }

    public static EngagementHistory empty() {
        return new EngagementHistory(List.of(), null);
    }

    /** Pushes recorded after {@code since}, later ones included. */
    public int countSince(Instant since) {
        return (int) sends.stream().filter(send -> send.sentAt().isAfter(since)).count();
    }

    /** Pushes whose local day in {@code zone} is the local day of {@code at}. */
    public int countOnLocalDay(Instant at, ZoneId zone) {
        LocalDate day = at.atZone(zone).toLocalDate();
        return (int) sends.stream().filter(send -> send.sentAt().atZone(zone).toLocalDate().equals(day)).count();
    }

    /** Whether any push lies less than {@code gap} before or after {@code at}. */
    public boolean anyWithin(Duration gap, Instant at) {
        return sends.stream().anyMatch(send -> Duration.between(send.sentAt(), at).abs().compareTo(gap) < 0);
    }

    /** The latest push of a type. */
    public Optional<Instant> lastOf(NotificationType type) {
        return sends.stream().filter(send -> send.type() == type).map(EngagementSend::sentAt).findFirst();
    }

    /** Pushes of a category recorded after {@code since}. */
    public int countInCategorySince(NotificationCategory category, Instant since) {
        return (int) sends.stream().filter(send -> send.type().category() == category && send.sentAt().isAfter(since)).count();
    }

    /** Pushes of a type recorded after {@code since}. */
    public int countOfTypeSince(NotificationType type, Instant since) {
        return (int) sends.stream().filter(send -> send.type() == type && send.sentAt().isAfter(since)).count();
    }

    /** How many of the latest sent pushes in a row were never opened. */
    public int unopenedStreak() {
        int streak = 0;
        for (EngagementSend send : delivered()) {
            if (send.opened()) {
                break;
            }
            streak++;
        }
        return streak;
    }

    /**
     * Engagement is paused when pushes kept coming for {@code pauseAfter} without any being opened, until the account
     * opens the app again. Opening the app after the pause began resumes it, and the count starts again from that open.
     */
    public boolean pausedAt(Instant at, Duration pauseAfter) {
        Instant reference = delivered().stream().filter(EngagementSend::opened).map(EngagementSend::sentAt).findFirst()
                .orElse(Instant.MIN);
        Optional<Instant> first = firstSentAfter(reference);
        if (first.isEmpty() || first.get().isAfter(at.minus(pauseAfter))) {
            return false;
        }
        Instant pausedFrom = first.get().plus(pauseAfter);
        if (Objects.isNull(lastActiveAt) || !lastActiveAt.isAfter(pausedFrom)) {
            return true;
        }
        Optional<Instant> sinceReturn = firstSentAfter(lastActiveAt);
        return sinceReturn.isPresent() && !sinceReturn.get().isAfter(at.minus(pauseAfter));
    }

    private Optional<Instant> firstSentAfter(Instant reference) {
        return delivered().stream().map(EngagementSend::sentAt).filter(sentAt -> sentAt.isAfter(reference))
                .min(Comparator.naturalOrder());
    }

    private List<EngagementSend> delivered() {
        return sends.stream().filter(EngagementSend::delivered).toList();
    }
}
