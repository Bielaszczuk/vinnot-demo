package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * A social publishing notice for administrators (#510): {@code failed} (with the {@code network} when there is one),
 * {@code draft} (finish the TikTok draft in the TikTok app) or {@code reconnect} (connect the {@code network} again). The
 * admin lives in the web, so the tap simply opens the app. Copy: {@code push/marketing_*.properties}.
 */
class SocialPublishingPushTemplate extends BundlePushTemplate {
    private final String key;

    SocialPublishingPushTemplate(NotificationType type, String key) {
        super(type, "marketing");
        this.key = key;
    }

    @Override
    protected PushContent render(PushCopy copy, NotificationLocale locale, Map<String, String> data) {
        Map<String, String> values = new HashMap<>();
        String network = data.get("network");
        if (Objects.nonNull(network)) {
            values.put("network", copy.has("network." + network) ? copy.text("network." + network, Map.of()) : network);
        }
        String body = Objects.isNull(network) && copy.has(key + ".bodyAll") ? key + ".bodyAll" : key + ".body";
        return new PushContent(copy.text(key + ".title", values), copy.text(body, values), "/");
    }
}
