package com.vinnot.notification.application.port.out;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationRequest;

/** Turns a request with a resolved recipient into its localized message. */
public interface NotificationRendererPort {
    RenderedNotification render(NotificationRequest request);
}
