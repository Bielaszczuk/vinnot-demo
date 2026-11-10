package com.vinnot.engagement.domain.model;

import com.vinnot.notification.domain.model.NotificationType;

import java.time.Duration;

/**
 * Per-type rules of the engagement catalog (#405, S13): the type's weight in the score (time-bound pushes such as the
 * day-after-event one rank above evergreen suggestions), the shortest time between two pushes of that type, and whether
 * it is an evergreen suggestion that takes turns with the others ({@code rotates}): the wine of the week every two
 * weeks and, in the weeks between, the suggested route or winery (S2, see {@code EngagementSelection}).
 */
public record EngagementRules(double weight, Duration cadence, boolean rotates) {
    /** An account that did not open the app for this long only gets come-back pushes. */
    public static final Duration INACTIVE_AFTER = Duration.ofDays(14);
    /** The second come-back push goes after this long without an app open; then silence. */
    public static final Duration SECOND_WINBACK_AFTER = Duration.ofDays(30);
    /** The wine of the week takes its turn again this long after the last wine suggestion. */
    public static final Duration WINE_OF_THE_WEEK_EVERY = Duration.ofDays(14);

    private static final EngagementRules ONCE_EACH = new EngagementRules(1.0, Duration.ZERO, false);
    private static final EngagementRules DAY_AFTER = new EngagementRules(0.95, Duration.ZERO, false);
    private static final EngagementRules WHEN_IT_HAPPENS = new EngagementRules(0.9, Duration.ZERO, false);
    private static final EngagementRules THURSDAYS = new EngagementRules(0.85, Duration.ofDays(6), false);
    private static final EngagementRules AFTER_VIEWS = new EngagementRules(0.8, Duration.ZERO, false);
    private static final EngagementRules WEEKLY = new EngagementRules(0.75, Duration.ofDays(7), true);
    private static final EngagementRules ROUTES = new EngagementRules(0.65, Duration.ofDays(14), true);
    private static final EngagementRules MONTHLY = new EngagementRules(0.6, Duration.ofDays(30), false);
    private static final EngagementRules WINERIES = new EngagementRules(0.6, Duration.ofDays(14), true);

    public static EngagementRules of(NotificationType type) {
        return switch (type) {
            case ONBOARDING -> ONCE_EACH;
            case POST_EVENT -> DAY_AFTER;
            case MILESTONE, WINBACK -> WHEN_IT_HAPPENS;
            case WEEKEND_EVENTS -> THURSDAYS;
            case VIEWED_NOT_RATED -> AFTER_VIEWS;
            case TASTE_PICK, WINE_RECOMMENDATION -> WEEKLY;
            case ROUTE_PICK -> ROUTES;
            case CELLAR_CHECKIN -> MONTHLY;
            case WINERY_PICK -> WINERIES;
            default -> throw new IllegalArgumentException(type + " is not an engagement push");
        };
    }
}
