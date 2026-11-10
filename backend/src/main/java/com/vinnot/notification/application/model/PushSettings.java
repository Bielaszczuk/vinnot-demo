package com.vinnot.notification.application.model;

import com.vinnot.notification.application.port.out.PushTypeSwitchPort;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationType;

import java.util.List;

/**
 * What the admin notifications section shows about push (#310): the server's provider, read-only and still the
 * last-resort switch for every push, each pushed type with its switch, and the latest switch changes.
 */
public record PushSettings(String provider, List<TypeSetting> types, List<PushTypeSwitchPort.Change> recentChanges) {
    public PushSettings {
        types = List.copyOf(types);
        recentChanges = List.copyOf(recentChanges);
    }

    /** {@code transactional} types are ones users cannot turn off themselves, such as tickets and payments. */
    public record TypeSetting(NotificationType type, NotificationCategory category, boolean transactional, boolean enabled) {
    }
}
