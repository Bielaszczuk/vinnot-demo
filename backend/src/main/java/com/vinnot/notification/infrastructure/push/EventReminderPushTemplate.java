package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * A reminder before the event ({@code window}: DAY_BEFORE or SOON), with the start in the venue's time zone and the
 * venue when known; a tap opens the ticket.
 */
@Component
class EventReminderPushTemplate extends BundlePushTemplate {
    EventReminderPushTemplate() {
        super(NotificationType.EVENT_REMINDER, "reminder");
    }

    @Override
    protected PushContent render(PushCopy copy, NotificationLocale locale, Map<String, String> data) {
        boolean soon = "SOON".equals(data.get("window"));
        String start = required(data, "startDate");
        Map<String, String> values = new HashMap<>();
        values.put("event", required(data, "title"));
        values.put("start", soon ? PushDates.time(start, data.get("timeZone"), locale)
                : PushDates.dateTime(start, data.get("timeZone"), locale));
        String venue = data.get("venue");
        String key = soon ? "soon" : "day";
        if (Objects.nonNull(venue) && !venue.isBlank()) {
            values.put("venue", venue);
        }
        String body = copy.text(key + (values.containsKey("venue") ? ".venueBody" : ".body"), values);
        return new PushContent(copy.text(key + ".title", values), body, "/my-tickets/" + required(data, "registrationId"));
    }
}
