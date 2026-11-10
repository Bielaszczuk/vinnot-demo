package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;

import java.util.Map;

/** Push copy for one notification type, in the app's professional register (no emoji, no shouting). */
public interface PushTemplate {
    NotificationType type();

    PushContent render(NotificationLocale locale, Map<String, String> data);
}
