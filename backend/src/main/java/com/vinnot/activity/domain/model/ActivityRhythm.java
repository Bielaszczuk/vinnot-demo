package com.vinnot.activity.domain.model;

import java.time.Instant;
import java.util.Objects;
import java.util.OptionalInt;
import java.util.UUID;

/**
 * When a user was last active and at what local hour they usually open the app, used to pick send times (#405).
 *
 * @param openHours the recorded opens of the recent window per local hour; empty when there were none
 */
public record ActivityRhythm(UUID userId, Instant lastActiveAt, OpenHourHistogram openHours) {
    public ActivityRhythm {
        Objects.requireNonNull(userId, "User cannot be null");
        Objects.requireNonNull(lastActiveAt, "Last activity cannot be null");
        openHours = Objects.requireNonNullElse(openHours, OpenHourHistogram.empty());
    }

    /** The usual local open hour of the recent window, empty when the user did not open the app in it. */
    public OptionalInt usualOpenHour() {
        return openHours.usualHour();
    }
}
