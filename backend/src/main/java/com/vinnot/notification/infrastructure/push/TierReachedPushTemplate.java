package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.springframework.stereotype.Component;

import java.util.Map;

/** The member reached a new wax-seal tier (#455); {@code tier} is the tier key. A tap opens the points screen ({@code /points}). */
@Component
class TierReachedPushTemplate extends BundlePushTemplate {
    static final String ROUTE = "/points";

    TierReachedPushTemplate() {
        super(NotificationType.TIER_REACHED, "points");
    }

    @Override
    protected PushContent render(PushCopy copy, NotificationLocale locale, Map<String, String> data) {
        String tier = required(data, "tier");
        Map<String, String> values = Map.of("tier", copy.text("tier." + tier, Map.of()));
        return content(copy, "reached", values, ROUTE);
    }
}
