package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * The weekly batch of social posts is waiting for approval (#489): {@code count} new posts. Approval lives in the
 * web admin, so the tap simply opens the app.
 */
@Component
class SocialBatchReadyPushTemplate extends BundlePushTemplate {
    SocialBatchReadyPushTemplate() {
        super(NotificationType.SOCIAL_BATCH_READY, "marketing");
    }

    @Override
    protected PushContent render(PushCopy copy, NotificationLocale locale, Map<String, String> data) {
        int count = Integer.parseInt(required(data, "count"));
        Map<String, String> values = Map.of("count", Integer.toString(count));
        return new PushContent(copy.text("batch.title", values), copy.text(count == 1 ? "batch.one" : "batch.other", values), "/");
    }
}
