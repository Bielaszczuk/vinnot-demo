package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.springframework.stereotype.Component;

import java.util.Map;

/** {@code follower} started following the member (#541); a tap opens the follower's public profile. */
@Component
class NewFollowerPushTemplate extends BundlePushTemplate {
    NewFollowerPushTemplate() {
        super(NotificationType.NEW_FOLLOWER, "community");
    }

    @Override
    protected PushContent render(PushCopy copy, NotificationLocale locale, Map<String, String> data) {
        return content(copy, "follower", Map.of("name", required(data, "follower")),
                "/users/" + required(data, "followerId"));
    }
}
