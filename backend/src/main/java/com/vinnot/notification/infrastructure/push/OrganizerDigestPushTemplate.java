package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * One push for a burst of registration activity on an organizer's event: confirmed places, requests awaiting
 * approval and cancellations, each only when there is any. A tap opens their events.
 */
@Component
class OrganizerDigestPushTemplate extends BundlePushTemplate {
    private static final List<String> COUNTS = List.of("confirmed", "requested", "cancelled");

    OrganizerDigestPushTemplate() {
        super(NotificationType.EVENT_REGISTRATION_ORGANIZER, "organizer");
    }

    @Override
    protected PushContent render(PushCopy copy, NotificationLocale locale, Map<String, String> data) {
        List<String> parts = new ArrayList<>();
        for (String count : COUNTS) {
            int value = Integer.parseInt(data.getOrDefault(count, "0"));
            if (value > 0) {
                parts.add(copy.text(count + (value == 1 ? ".one" : ".other"), Map.of("count", Integer.toString(value))));
            }
        }
        Map<String, String> values = Map.of("event", required(data, "title"), "activity",
                parts.isEmpty() ? copy.text("activity.none", Map.of()) : String.join(" · ", parts));
        return content(copy, "digest", values, "/partner/events");
    }
}
