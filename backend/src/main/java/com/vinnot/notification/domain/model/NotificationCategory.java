package com.vinnot.notification.domain.model;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/** Preference grouping of notification types (#294). */
public enum NotificationCategory {
    ACCOUNT(Kind.TRANSACTIONAL, true),
    SECURITY(Kind.TRANSACTIONAL, true),
    PAYMENTS(Kind.TRANSACTIONAL, true),
    TICKETS(Kind.TRANSACTIONAL, true),
    SUBMISSIONS(Kind.TRANSACTIONAL, false),
    SUPPORT(Kind.TRANSACTIONAL, false),
    /** Moderation outcomes for authors and reporters, and alerts for the moderation team (#307). */
    MODERATION(Kind.TRANSACTIONAL, false),
    /** At most one "new event near you" push per account in any 24 hours, however many events are published. */
    EVENTS_NEARBY(Kind.OPTIONAL, true, new PushLimit(1, Duration.ofDays(1))),
    /** At most one wine recommendation push per account in any 7 days (#306). */
    RECOMMENDATIONS(Kind.PROMOTIONAL, true, new PushLimit(1, Duration.ofDays(7))),
    COMMUNITY(Kind.OPTIONAL, true),
    /**
     * Nudges about the user's own activity: wines to rate, cellar check-ins, onboarding steps and come-back
     * suggestions (#405). No limit of its own: the engagement budget decides how many are sent.
     */
    REMINDERS(Kind.OPTIONAL, true),
    NEWSLETTER(Kind.PROMOTIONAL, true);

    /**
     * Transactional notifications are always delivered. Every listed category, promotional ones included, is on
     * until the user turns it off (#347). Promotional ones also stop when the user revokes marketing consent; an
     * account that never decided counts as consenting ({@link MarketingConsent#none()}).
     */
    public enum Kind { TRANSACTIONAL, OPTIONAL, PROMOTIONAL }

    private final Kind kind;
    private final boolean listed;
    private final PushLimit pushLimit;

    /**
     * How many pushes of one category an account may get in any rolling window, on top of the global daily cap.
     *
     * @param count  the most pushes inside the window
     * @param window how far back sends are counted
     */
    public record PushLimit(int count, Duration window) { }

    NotificationCategory(Kind kind, boolean listed) {
        this(kind, listed, null);
    }

    NotificationCategory(Kind kind, boolean listed, PushLimit pushLimit) {
        this.kind = kind;
        this.listed = listed;
        this.pushLimit = pushLimit;
    }

    /** The category's own push limit, if it has one. */
    public Optional<PushLimit> pushLimit() {
        return Optional.ofNullable(pushLimit);
    }

    public Kind kind() {
        return kind;
    }

    public boolean transactional() {
        return kind == Kind.TRANSACTIONAL;
    }

    public boolean promotional() {
        return kind == Kind.PROMOTIONAL;
    }

    /** The categories a user sees in their preferences, in display order. */
    public static List<NotificationCategory> preferenceCategories() {
        return Arrays.stream(values()).filter(category -> category.listed).toList();
    }
}
