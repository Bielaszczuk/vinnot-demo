package com.vinnot.notification.application.port.out;

import com.vinnot.notification.domain.model.NotificationRequest;

/** Durable storage that joins the caller's transaction and ignores a repeated dedupe key. */
public interface NotificationOutboxPort {
    void store(NotificationRequest request);
}
