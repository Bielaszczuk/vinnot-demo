package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/** A new event was published in the user's area: its name, start and place when known; a tap opens the event. */
@Component
class EventNearbyPushTemplate extends BundlePushTemplate {
    EventNearbyPushTemplate() {
        super(NotificationType.EVENT_NEARBY, "nearby");
    }

    @Override
    protected PushContent render(PushCopy copy, NotificationLocale locale, Map<String, String> data) {
        Map<String, String> values = new HashMap<>();
        values.put("event", required(data, "title"));
        values.put("start", PushDates.dateTime(required(data, "startDate"), data.get("timeZone"), locale));
        String place = data.get("place");
        if (Objects.nonNull(place) && !place.isBlank()) {
            values.put("place", place);
        }
        String body = copy.text(values.containsKey("place") ? "new.placeBody" : "new.body", values);
        return new PushContent(copy.text("new.title", values), body, "/events/" + required(data, "eventId"));
    }
}
