package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.springframework.stereotype.Component;

import java.util.Map;

/** {@code commenter} commented on the member's review of {@code wineName} (#308); a tap opens the wine. */
@Component
class ReviewCommentPushTemplate extends BundlePushTemplate {
    ReviewCommentPushTemplate() {
        super(NotificationType.REVIEW_COMMENT, "community");
    }

    @Override
    protected PushContent render(PushCopy copy, NotificationLocale locale, Map<String, String> data) {
        Map<String, String> values = Map.of("name", required(data, "commenter"), "wine", required(data, "wineName"));
        return new PushContent(copy.text("comment.title", values), copy.text("comment.body", values),
                "/wines/" + required(data, "wineId"));
    }
}
