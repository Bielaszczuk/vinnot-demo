package com.vinnot.notification.application.port.out;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationType;

/** A delivery channel. Implementations throw on failure and never replay ambiguous sends themselves. */
public interface NotificationDeliveryPort {
    void send(NotificationType type, String recipient, RenderedNotification message);
}
