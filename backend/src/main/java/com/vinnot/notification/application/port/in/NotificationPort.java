package com.vinnot.notification.application.port.in;

import com.vinnot.notification.domain.model.NotificationRequest;

/**
 * The single entry point business modules use to send notifications. The request is stored in the
 * caller's transaction and delivered later, so a provider outage never fails or rolls back business work.
 */
public interface NotificationPort {
    void enqueue(NotificationRequest request);
}
