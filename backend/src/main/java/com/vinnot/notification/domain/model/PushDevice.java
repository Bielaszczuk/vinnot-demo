package com.vinnot.notification.domain.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * A device that receives pushes for one account, in the language the app runs in. {@code lastSeenAt} is the last time
 * the app registered it (every cold start); {@code channels} says the app created the per-category Android channels.
 */
public record PushDevice(UUID userId, PushToken token, PushPlatform platform, NotificationLocale locale, Instant lastSeenAt,
        boolean channels) {
    public PushDevice {
        Objects.requireNonNull(userId, "userId");
        Objects.requireNonNull(token, "token");
        Objects.requireNonNull(platform, "platform");
        Objects.requireNonNull(locale, "locale");
        Objects.requireNonNull(lastSeenAt, "lastSeenAt");
    }

    /** A device registered by an app version without the per-category channels. */
    public PushDevice(UUID userId, PushToken token, PushPlatform platform, NotificationLocale locale, Instant lastSeenAt) {
        this(userId, token, platform, locale, lastSeenAt, false);
    }
}
