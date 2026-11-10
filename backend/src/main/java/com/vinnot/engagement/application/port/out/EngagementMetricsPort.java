package com.vinnot.engagement.application.port.out;

import com.vinnot.engagement.application.model.EngagementMetrics;
import com.vinnot.notification.domain.model.NotificationType;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

/** Engagement counts per type from the ledger, push opens and preference changes. */
public interface EngagementMetricsPort {
    /**
     * Counts of the pushes recorded since {@code since}; an opt-out is the recipient turning the type's category off for
     * push within {@code optOutWindow} after it. Types without rows are absent.
     */
    Map<NotificationType, EngagementMetrics.Counts> countsSince(Instant since, Duration optOutWindow);

    /** The same, each type counted from its own start; types left out of {@code since} are not counted. */
    Map<NotificationType, EngagementMetrics.Counts> countsSince(Map<NotificationType, Instant> since, Duration optOutWindow);
}
