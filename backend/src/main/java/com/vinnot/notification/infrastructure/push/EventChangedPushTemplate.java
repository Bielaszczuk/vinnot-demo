package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** The attendee's event has a new date, time or venue ({@code change}: DATE, VENUE or BOTH); a tap opens the event. */
@Component
class EventChangedPushTemplate extends BundlePushTemplate {
    private static final Set<String> CHANGES = Set.of("DATE", "VENUE", "BOTH");

    EventChangedPushTemplate() {
        super(NotificationType.EVENT_CHANGED_ATTENDEE, "event");
    }

    @Override
    protected PushContent render(PushCopy copy, NotificationLocale locale, Map<String, String> data) {
        String change = data.getOrDefault("change", "BOTH");
        String key = "changed." + (CHANGES.contains(change) ? change : "BOTH").toLowerCase(Locale.ROOT);
        return content(copy, key, Map.of("event", required(data, "title")), "/events/" + required(data, "eventId"));
    }
}
