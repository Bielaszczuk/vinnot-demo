package com.vinnot.notification.infrastructure.push;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Objects;

/**
 * The day's likes on the member's reviews (#308): one like names the {@code liker}, several on one review are counted
 * with its wine, several across reviews add the most liked one's wine. A tap opens that wine.
 */
@Component
class ReviewLikesPushTemplate extends BundlePushTemplate {
    ReviewLikesPushTemplate() {
        super(NotificationType.REVIEW_LIKES_DAILY, "community");
    }

    @Override
    protected PushContent render(PushCopy copy, NotificationLocale locale, Map<String, String> data) {
        String liker = data.get("liker");
        Map<String, String> values = Objects.isNull(liker)
                ? Map.of("count", required(data, "likes"), "wine", required(data, "wineName"))
                : Map.of("name", liker, "wine", required(data, "wineName"));
        String body = Objects.nonNull(liker) ? "likes.oneBody"
                : "1".equals(required(data, "reviews")) ? "likes.reviewBody" : "likes.reviewsBody";
        return new PushContent(copy.text(Objects.isNull(liker) ? "likes.title" : "likes.oneTitle", values),
                copy.text(body, values), "/wines/" + required(data, "wineId"));
    }
}
