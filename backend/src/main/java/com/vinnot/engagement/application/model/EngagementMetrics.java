package com.vinnot.engagement.application.model;

import com.vinnot.notification.domain.model.NotificationType;

import java.time.Instant;
import java.util.List;

/**
 * Engagement results per type since {@code since} (#405, S17): pushes sent, opened, followed by the recipient turning
 * the category off within the opt-out window, and held out for measurement; plus whether the type is on.
 */
public record EngagementMetrics(int days, Instant since, List<TypeMetrics> types) {
    public EngagementMetrics {
        types = List.copyOf(types);
    }

    public record TypeMetrics(NotificationType type, long sent, long opened, long optedOut, long heldOut, boolean enabled) {
        public double openRate() {
            return sent == 0 ? 0 : (double) opened / sent;
        }

        public double optOutRate() {
            return sent == 0 ? 0 : (double) optedOut / sent;
        }
    }

    /** The raw counts of one type, as stored. */
    public record Counts(long sent, long opened, long optedOut, long heldOut) {
        public static final Counts NONE = new Counts(0, 0, 0, 0);
    }
}
