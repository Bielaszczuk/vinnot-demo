package com.vinnot.notification.application.port.out;

import com.vinnot.notification.domain.model.ConsentSource;
import com.vinnot.notification.domain.model.NotificationPreferences;

import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/** Stored notification choices and the marketing consent history of a user. */
public interface NotificationPreferenceRepositoryPort {

    NotificationPreferences load(UUID userId);

    /**
     * The preferences of many accounts at once, one entry per requested account (defaults when it chose nothing).
     * Stores override this to read them in one batch instead of once per account.
     */
    default Map<UUID, NotificationPreferences> loadAll(Collection<UUID> userIds) {
        Map<UUID, NotificationPreferences> loaded = new HashMap<>();
        userIds.forEach(userId -> loaded.put(userId, load(userId)));
        return loaded;
    }

    void saveChoices(UUID userId, Map<NotificationPreferences.Choice, Boolean> choices, Instant at);

    void recordConsent(UUID userId, boolean granted, ConsentSource source, Instant at);
}
