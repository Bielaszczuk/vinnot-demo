package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.in.PushPlanningUseCase;
import com.vinnot.notification.application.port.out.NotificationPreferenceRepositoryPort;
import com.vinnot.notification.application.port.out.PushTypeSwitchPort;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationChannel;
import com.vinnot.notification.domain.model.NotificationPreferences;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.domain.exception.DomainException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collection;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class PushPlanningService implements PushPlanningUseCase {
    /** Shown as the author of an automatic pause in the switch audit. */
    static final String AUTO_PAUSE_ACTOR = "automatic pause (opt-out rate)";
    private final NotificationPreferenceRepositoryPort preferences;
    private final PushTypeSwitchPort switches;
    private final Clock clock;

    @Autowired
    public PushPlanningService(NotificationPreferenceRepositoryPort preferences, PushTypeSwitchPort switches) {
        this(preferences, switches, Clock.systemUTC());
    }

    PushPlanningService(NotificationPreferenceRepositoryPort preferences, PushTypeSwitchPort switches, Clock clock) {
        this.preferences = preferences;
        this.switches = switches;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, Set<NotificationCategory>> pushCategories(Collection<UUID> userIds) {
        Map<UUID, Set<NotificationCategory>> allowed = new HashMap<>();
        if (userIds.isEmpty()) {
            return allowed;
        }
        Map<UUID, NotificationPreferences> loaded = preferences.loadAll(userIds);
        for (UUID userId : userIds) {
            NotificationPreferences choices = loaded.getOrDefault(userId, NotificationPreferences.defaults());
            Set<NotificationCategory> categories = EnumSet.noneOf(NotificationCategory.class);
            Arrays.stream(NotificationCategory.values())
                    .filter(category -> choices.allows(category, NotificationChannel.PUSH))
                    .forEach(categories::add);
            allowed.put(userId, categories);
        }
        return allowed;
    }

    @Override
    @Transactional(readOnly = true)
    public Set<NotificationType> switchedOff() {
        return switches.disabledTypes();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<NotificationType, Instant> lastTurnedOn() {
        return switches.lastTurnedOn();
    }

    @Override
    @Transactional
    public boolean pauseAutomatically(NotificationType type) {
        if (!type.engagement()) {
            throw new DomainException("NOT_AN_ENGAGEMENT_TYPE", "Only engagement pushes are paused automatically");
        }
        return switches.change(type, false, new PushTypeSwitchPort.Actor(null, AUTO_PAUSE_ACTOR), clock.instant());
    }
}
