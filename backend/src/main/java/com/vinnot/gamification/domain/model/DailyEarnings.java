package com.vinnot.gamification.domain.model;

/**
 * Points a member earned since the start of their local day (awards only, revocations do not give the allowance
 * back).
 *
 * @param fromSource points from the source being awarded
 * @param withinCap  points from every source that counts toward the global daily cap
 */
public record DailyEarnings(int fromSource, int withinCap) {
    public static final DailyEarnings NONE = new DailyEarnings(0, 0);
}
