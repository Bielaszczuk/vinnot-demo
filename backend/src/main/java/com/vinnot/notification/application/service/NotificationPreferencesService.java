package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.in.ManageNotificationPreferencesUseCase;
import com.vinnot.notification.application.port.out.NotificationPreferenceRepositoryPort;
import com.vinnot.notification.application.port.out.PushRendererPort;
import com.vinnot.notification.domain.model.ConsentSource;
import com.vinnot.notification.domain.model.MarketingConsent;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationChannel;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.NotificationPreferences;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class NotificationPreferencesService implements ManageNotificationPreferencesUseCase {
    private final NotificationPreferenceRepositoryPort repository;
    private final PushRendererPort pushTemplates;
    private final Clock clock;

    @Autowired
    public NotificationPreferencesService(NotificationPreferenceRepositoryPort repository,
            PushRendererPort pushTemplates) {
        this(repository, pushTemplates, Clock.systemUTC());
    }

    NotificationPreferencesService(NotificationPreferenceRepositoryPort repository, PushRendererPort pushTemplates,
            Clock clock) {
        this.repository = repository;
        this.pushTemplates = pushTemplates;
        this.clock = clock;
    }

    @Override
    public Map<NotificationCategory, Set<NotificationChannel>> availableChannels() {
        Set<NotificationType> pushed = pushTemplates.types();
        Map<NotificationCategory, Set<NotificationChannel>> channels = new EnumMap<>(NotificationCategory.class);
        for (NotificationCategory category : NotificationCategory.values()) {
            channels.put(category, EnumSet.noneOf(NotificationChannel.class));
        }
        for (NotificationType type : NotificationType.values()) {
            Set<NotificationChannel> reached = channels.get(type.category());
            if (type.emails()) {
                reached.add(NotificationChannel.EMAIL);
            }
            if (pushed.contains(type)) {
                reached.add(NotificationChannel.PUSH);
            }
        }
        return channels;
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationPreferences get(UUID userId) {
        return repository.load(userId);
    }

    @Override
    @Transactional
    public NotificationPreferences update(UUID userId, Map<NotificationPreferences.Choice, Boolean> choices,
            Boolean marketingConsent, ConsentSource source) {
        Instant now = clock.instant();
        NotificationPreferences current = repository.load(userId);
        Map<NotificationPreferences.Choice, Boolean> changes = Objects.requireNonNullElse(choices, Map.of());
        // Validates transactional categories before anything is written.
        current.withChoices(changes);
        // An explicit answer is recorded the first time even when it matches the default, so it is on file.
        if (Objects.nonNull(marketingConsent) && (!current.marketingConsent().decided()
                || marketingConsent != current.marketingConsent().granted())) {
            Objects.requireNonNull(source, "A consent decision needs its source");
            repository.recordConsent(userId, marketingConsent, source, now);
            current = new NotificationPreferences(current.choices(),
                    new MarketingConsent(marketingConsent, now, source));
        }
        current.requireConsentFor(changes);
        if (!changes.isEmpty()) {
            repository.saveChoices(userId, changes, now);
        }
        return current.withChoices(changes);
    }
}
