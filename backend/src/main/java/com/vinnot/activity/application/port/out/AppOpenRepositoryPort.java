package com.vinnot.activity.application.port.out;

import com.vinnot.activity.domain.model.OpenHourHistogram;

import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import java.util.UUID;

public interface AppOpenRepositoryPort {
    /**
     * Records an open and moves the user's last activity to it, unless the last recorded open is less than
     * {@code minimumGap} before it. Atomic per user, so concurrent requests record at most one open.
     *
     * @return whether the open was recorded; false when throttled or the account no longer exists
     */
    boolean recordOpen(UUID userId, Instant at, Duration minimumGap);

    /** The last recorded activity per user; users without one are absent. */
    Map<UUID, Instant> lastActive(Collection<UUID> userIds);

    /** Recorded opens since the instant per hour of the day in each user's time zone; users without opens are absent. */
    Map<UUID, OpenHourHistogram> openHoursSince(Collection<UUID> userIds, Instant since);

    /** Deletes at most {@code batchSize} recorded opens before the cutoff and says how many it deleted. */
    int purgeBefore(Instant cutoff, int batchSize);

    /** Forgets at most {@code batchSize} last activities before the cutoff and says how many it forgot. */
    int purgeLastActiveBefore(Instant cutoff, int batchSize);
}
