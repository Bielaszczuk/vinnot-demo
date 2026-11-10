package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.in.UnsubscribeUseCase;
import com.vinnot.notification.application.port.out.NotificationPreferenceRepositoryPort;
import com.vinnot.notification.application.port.out.UnsubscribeLinkPort;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationChannel;
import com.vinnot.notification.domain.model.NotificationPreferences;
import com.vinnot.shared.domain.exception.DomainException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;

@Service
public class UnsubscribeService implements UnsubscribeUseCase {
    private final UnsubscribeLinkPort links;
    private final NotificationPreferenceRepositoryPort preferences;

    public UnsubscribeService(UnsubscribeLinkPort links, NotificationPreferenceRepositoryPort preferences) {
        this.links = links;
        this.preferences = preferences;
    }

    @Override
    @Transactional
    public NotificationCategory unsubscribe(String token) {
        UnsubscribeLinkPort.UnsubscribeTarget target = links.verify(token)
                .filter(found -> !found.category().transactional())
                .orElseThrow(() -> new DomainException("INVALID_UNSUBSCRIBE_LINK", "This unsubscribe link is not valid"));
        preferences.saveChoices(target.userId(), Map.of(
                new NotificationPreferences.Choice(target.category(), NotificationChannel.EMAIL), false), Instant.now());
        return target.category();
    }
}
