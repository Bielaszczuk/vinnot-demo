package com.vinnot.notification.application.port.in;

import com.vinnot.notification.domain.model.NotificationRequest;

/** Delivers one stored notification. Failures propagate so the durable worker can retry. */
public interface DeliverNotificationUseCase {
    void deliver(NotificationRequest request);

    /** The outbox gave up on this message: its last attempt failed and it is never sent again (#490). */
    void gaveUp(NotificationRequest request);
}
