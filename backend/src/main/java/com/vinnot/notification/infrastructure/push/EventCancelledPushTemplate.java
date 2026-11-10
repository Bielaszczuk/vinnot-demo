package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.springframework.stereotype.Component;

import java.util.Map;

/** The attendee's event was cancelled; a tap opens their tickets, where the reason and refund are shown. */
@Component
class EventCancelledPushTemplate extends BundlePushTemplate {
    EventCancelledPushTemplate() {
        super(NotificationType.EVENT_CANCELLED_ATTENDEE, "event");
    }

    @Override
    protected PushContent render(PushCopy copy, NotificationLocale locale, Map<String, String> data) {
        return content(copy, "cancelled", Map.of("event", required(data, "title")), "/my-tickets");
    }
}
