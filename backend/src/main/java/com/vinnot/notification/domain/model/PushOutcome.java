package com.vinnot.notification.domain.model;

/**
 * What happened to a push for one account (#310). Every outcome counts accounts except {@link #FAILED}, which counts
 * device messages the provider rejected, when sending or later in its receipt.
 */
public enum PushOutcome {
    /** The provider accepted at least one of the account's device messages. */
    SENT,
    /** The account turned the category off for push, or a promotional push lacks marketing consent. */
    BLOCKED_BY_PREFERENCES,
    /** Stored again for the end of the account's quiet hours. */
    DEFERRED_QUIET_HOURS,
    /** The account already got the daily number of optional pushes. */
    DROPPED_DAILY_CAP,
    /** The account already got its category's pushes for the window. */
    DROPPED_CATEGORY_CAP,
    /** Too late to be useful: the push, or the end of the quiet hours it waited for, is past its deadline. */
    EXPIRED,
    /** The provider rejected the message for a device. */
    FAILED,
    /** An administrator turned the type off, or it was paused automatically for its opt-out rate (#405). */
    SWITCHED_OFF,
    /** Engagement push (#405): the account already got its engagement pushes for the week or the day, or one too recently. */
    DROPPED_ENGAGEMENT_BUDGET,
    /** Engagement push (#405): the account stopped opening them, so it gets fewer (one a week) or none until it returns. */
    DROPPED_FATIGUE,
    /** Engagement push (#405): the account is in the measurement holdout, which never gets engagement pushes. */
    DROPPED_HOLDOUT
}
