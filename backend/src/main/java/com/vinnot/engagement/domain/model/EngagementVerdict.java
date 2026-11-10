package com.vinnot.engagement.domain.model;

/** Whether an account may receive one more engagement push at a given instant (#405). */
public enum EngagementVerdict {
    ALLOWED,
    /** Past the weekly or daily budget, or less than the minimum gap after another engagement push. */
    OVER_BUDGET,
    /** Stopped opening them: past the reduced weekly budget of a fatigued account. */
    FATIGUED,
    /** Pushes kept coming for weeks without an open: paused until the account opens the app again. */
    PAUSED
}
