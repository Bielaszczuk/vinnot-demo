package com.vinnot.notification.application.port.out;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;

import java.util.Map;
import java.util.Set;

/** Turns a push type and its data into what a device shows, in the device's language. */
public interface PushRendererPort {
    PushContent render(NotificationType type, NotificationLocale locale, Map<String, String> data);

    /** The types that can be pushed: those with a push template. */
    Set<NotificationType> types();
}
