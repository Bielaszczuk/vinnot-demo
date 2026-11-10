package com.vinnot.notification.application.service;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.application.port.out.NotificationOutboxPort;
import com.vinnot.notification.domain.model.NotificationRequest;
import org.springframework.stereotype.Service;

@Service
public class EnqueueNotificationService implements NotificationPort {
    private final NotificationOutboxPort outbox;

    public EnqueueNotificationService(NotificationOutboxPort outbox) {
        this.outbox = outbox;
    }

    @Override
    public void enqueue(NotificationRequest request) {
        if (!request.category().transactional() && request.recipient().isAddress()) {
            // Preferences, consent and unsubscribe links belong to an account.
            throw new IllegalArgumentException("Optional notifications are only sent to users");
        }
        outbox.store(request);
    }
}
