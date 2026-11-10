package com.vinnot.notification.infrastructure.template;

import com.vinnot.notification.application.model.RenderedNotification;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;

import java.util.Set;

/** Renders one notification type. Spring beans implementing this are registered automatically. */
public interface NotificationTemplate {
    NotificationType type();

    Set<NotificationLocale> locales();

    /** Called only for a locale listed in {@link #locales()} and a request with a resolved address. */
    RenderedNotification render(NotificationRequest request);
}
