package com.vinnot.notification.application.port.in;

import com.vinnot.notification.domain.model.ConsentSource;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationChannel;
import com.vinnot.notification.domain.model.NotificationPreferences;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Reads and changes a user's notification preferences. */
public interface ManageNotificationPreferencesUseCase {

    NotificationPreferences get(UUID userId);

    /**
     * The channels each category can reach, from the types it groups: email when one of them is emailed, push when
     * one of them has a push template. A switch for a channel a category never uses changes nothing.
     */
    Map<NotificationCategory, Set<NotificationChannel>> availableChannels();

    /**
     * Applies the choices and, when {@code marketingConsent} is not null and differs from the current decision,
     * records the new decision with its source. Consent is applied first, so one request can grant it and turn a
     * promotional category on.
     */
    NotificationPreferences update(UUID userId, Map<NotificationPreferences.Choice, Boolean> choices,
            Boolean marketingConsent, ConsentSource source);
}
